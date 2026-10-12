import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Commission / chef-payout rate resolution.
 *
 * WHY THIS EXISTS
 *   The 85/15 split is currently hardcoded in several places. That is wrong for
 *   two reasons: it cannot be changed without a deploy, and — more seriously —
 *   it silently applies ONE rate to every historical booking retroactively.
 *
 *   The rule this module enforces:
 *     • The live rate lives in `platform_settings.commission`.
 *     • That row is seeded INACTIVE with NULL rates (migration 01), because no
 *       commercial rate has been approved.
 *     • Until an admin activates it, callers fall back to the legacy 0.85 so
 *       that already-booked work keeps its original terms and nothing breaks.
 *     • Anything derived from the fallback is INDICATIVE and must be labelled as
 *       an estimate in the UI. It is not a payable figure.
 *
 * Historical bookings must never be repriced by a rate change. When the rate is
 * approved, snapshot it onto the booking at assignment time (see
 * `payout_rate_snapshot`) rather than recomputing from settings at payout.
 */

/** Legacy split, in force before the rate was made configurable. */
export const LEGACY_CHEF_PAYOUT_RATE = 0.85;

/**
 * PROVISIONAL deposit rate.
 *
 * This is the share of the booking total collected up front. It is NOT the
 * commission rate and must not be derived from it — they are separate
 * commercial decisions.
 *
 * No deposit policy has been approved. The previous code inlined `0.15` at the
 * one call site that computed a deposit, so the figure was neither
 * configurable nor visible as an unapproved term. It is named here so there is
 * exactly one place to change it, and so the unapproved status is legible in
 * code review.
 *
 * Replace with an approved figure once the deposit model (deposit vs full
 * payment) is settled.
 */
export const PROVISIONAL_DEPOSIT_RATE = 0.15;

export type CommissionResolution = {
  /** Fraction of the booking total paid to the chef. */
  chefPayoutRate: number;
  /** Fraction retained by the platform. */
  platformRate: number;
  /**
   * "configured" — read from an ACTIVE platform_settings row.
   * "legacy"     — no active rate; the pre-existing 0.85 split is assumed.
   *
   * "legacy" results are estimates, not payable amounts.
   */
  source: "configured" | "legacy";
  /** True when the figure must be presented to users as an estimate. */
  isIndicative: boolean;
};

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the effective chef payout rate.
 *
 * Never throws: a settings read failure degrades to the legacy rate rather than
 * breaking the dispatch or notification path.
 */
export async function resolveCommission(
  supabase: Pick<SupabaseClient, "from">
): Promise<CommissionResolution> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, is_active")
      .eq("key", "commission")
      .maybeSingle();

    if (error || !data || data.is_active !== true) {
      return legacy();
    }

    const value = (data.value ?? {}) as Record<string, unknown>;
    const chef = num(value.chef_payout_rate) ?? num(value.chefPayoutRate);
    const platform = num(value.platform_rate) ?? num(value.platformRate);

    if (chef === null || chef < 0 || chef > 1) {
      return legacy();
    }

    return {
      chefPayoutRate: chef,
      platformRate: platform ?? 1 - chef,
      source: "configured",
      isIndicative: false,
    };
  } catch {
    return legacy();
  }
}

function legacy(): CommissionResolution {
  return {
    chefPayoutRate: LEGACY_CHEF_PAYOUT_RATE,
    platformRate: 1 - LEGACY_CHEF_PAYOUT_RATE,
    source: "legacy",
    isIndicative: true,
  };
}

/**
 * Chef payout for a booking total.
 *
 * With an unapproved (legacy) rate this is an ESTIMATE. Label it as such.
 */
export async function estimateChefPayout(
  supabase: Pick<SupabaseClient, "from">,
  bookingTotal: number
): Promise<{ amount: number; resolution: CommissionResolution }> {
  const resolution = await resolveCommission(supabase);
  const amount = Math.round(Number(bookingTotal || 0) * resolution.chefPayoutRate);
  return { amount, resolution };
}
