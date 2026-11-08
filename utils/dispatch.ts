import { createClient } from "@/utils/supabase/server";
import { notifyChefOfNewRequest } from "@/utils/whatsapp-notify";
import { estimateChefPayout } from "@/utils/commission";
import { runWithSchemaFallback, safeDispatchLog } from "@/utils/schemaFallback";

/**
 * Shared dispatch matching logic.
 *
 * Finds the best available chef for a `pending_assignment` booking and offers
 * it to exactly one chef. Used by `/api/dispatch/match` and by
 * `/api/bookings/create`.
 *
 * Hard rules, each one learned from a production failure:
 *   • A chef with no `user_id` can never accept. The live project had eight of
 *     nine listings in that state, and dispatch kept assigning work to them.
 *   • Assignment is conditional on the booking still being unassigned. Two
 *     concurrent requests must not both win.
 *   • A chef already working that date is skipped. Before this, nothing checked
 *     the calendar, so a chef could be double-booked.
 *   • If the best candidate cannot take it, the next candidate is tried instead
 *     of leaving the request unassigned.
 */

const ACTIVE_STATUSES = [
  "assigned",
  "chef_accepted",
  "payment_pending",
  "confirmed",
  "en_route",
  "cooking",
  "in_progress",
];

type MatchResult = {
  success: boolean;
  chef_id?: string;
  chef_name?: string;
  match_score?: number;
  error?: string;
};

function requestedCuisinesFrom(booking: any): string[] {
  if (Array.isArray(booking.cuisine_types) && booking.cuisine_types.length) {
    return booking.cuisine_types.filter(Boolean);
  }
  if (booking.cuisine_type) return [booking.cuisine_type];

  // Pre-migration rows store the facets as JSON in dispatch_notes.
  if (typeof booking.dispatch_notes === "string") {
    try {
      const parsed = JSON.parse(booking.dispatch_notes);
      if (Array.isArray(parsed?.cuisines) && parsed.cuisines.length) {
        return parsed.cuisines.filter(Boolean);
      }
    } catch {
      // Plain-text dispatch notes: nothing structured to read.
    }
  }
  return [];
}

function scoreChef(chef: any, booking: any, cuisineList: string[]): number {
  let score = 0;

  // Cuisine match (0-48 points including related credit)
  if (cuisineList.length > 0) {
    const chefCuisines: string[] = chef.cuisines || [];

    if (cuisineList.includes("Any")) {
      score += 40;
    } else {
      const directHits = cuisineList.filter((c) => chefCuisines.includes(c));

      if (directHits.length > 0) {
        if (directHits.length >= cuisineList.length) score += 40;
        else if (directHits.length >= 2) score += 32;
        else score += 25;

        const relatedMap: Record<string, string[]> = {
          Swahili: ["Seafood", "Coastal Fusion"],
          Seafood: ["Swahili", "Coastal Fusion"],
          BBQ: ["Nyama Choma", "Kenyan Traditional"],
          "Nyama Choma": ["BBQ", "Kenyan Traditional"],
          Italian: ["Continental", "Fine Dining"],
          Continental: ["Italian", "Fine Dining"],
          "Fine Dining": ["Continental", "Italian"],
          Indian: ["Pan-Asian"],
          "Pan-Asian": ["Indian"],
          Vegan: ["Vegetarian"],
          Vegetarian: ["Vegan"],
        };
        const relatedHit = cuisineList.some((c) =>
          (relatedMap[c] || []).some((r) => chefCuisines.includes(r))
        );
        if (relatedHit) score += 8;
      }
    }
  }

  // Location match (0-30 points)
  const bookingCity = String(booking.location_city || "").toLowerCase();
  const address = String(booking.location_address || "").toLowerCase();
  if (bookingCity && String(chef.city || "").toLowerCase().includes(bookingCity)) {
    score += 30;
  } else if (
    address &&
    Array.isArray(chef.service_areas) &&
    chef.service_areas.some((area: string) =>
      address.includes(String(area).toLowerCase())
    )
  ) {
    score += 25;
  }

  // Budget fit (0-20 points)
  if (booking.budget_per_person) {
    const chefPrice = Number(chef.price_per_guest) || 4500;
    const budget = Number(booking.budget_per_person);
    if (chefPrice <= budget) score += 20;
    else if (chefPrice <= budget * 1.2) score += 10;
  }

  // Rating bonus (0-10 points)
  score += Math.min(10, (Number(chef.rating) || 5) * 2);

  return score;
}

export async function matchChefToBooking(
  supabase: ReturnType<typeof createClient>,
  bookingId: string
): Promise<MatchResult> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.status !== "pending_assignment" || booking.chef_id) {
    return {
      success: false,
      error: `Booking is already in '${booking.status}' state.`,
    };
  }

  // Only chefs who can actually sign in are eligible. `chef_availability(*)`
  // is a convenience: if the relation is missing the fallback query still
  // returns usable chefs instead of failing the whole dispatch.
  let chefs: any[] | null = null;
  const joined = await supabase
    .from("chefs")
    .select("*, chef_availability(*)")
    .eq("verified", true)
    .eq("is_available", true)
    .not("user_id", "is", null);

  if (joined.error) {
    const plain = await supabase
      .from("chefs")
      .select("*")
      .eq("verified", true)
      .eq("is_available", true)
      .not("user_id", "is", null);
    chefs = (plain.data as any[]) || [];
  } else {
    chefs = (joined.data as any[]) || [];
  }

  if (chefs.length === 0) {
    return {
      success: false,
      error:
        "No chefs are online with a working login. The request stays open for the next available chef.",
    };
  }

  // Skip chefs already working that calendar day. One dinner per chef per day
  // unless their availability row explicitly allows more.
  const { data: sameDay } = await supabase
    .from("bookings")
    .select("chef_id")
    .eq("booking_date", booking.booking_date)
    .in("status", ACTIVE_STATUSES);

  const chefLoad = new Map<string, number>();
  ((sameDay as any[]) || []).forEach((row) => {
    if (!row.chef_id) return;
    chefLoad.set(row.chef_id, (chefLoad.get(row.chef_id) || 0) + 1);
  });

  const cuisineList = requestedCuisinesFrom(booking);

  const scored = chefs
    .filter((chef) => {
      const load = chefLoad.get(chef.id) || 0;
      if (load === 0) return true;
      const availability = Array.isArray(chef.chef_availability)
        ? chef.chef_availability[0]
        : chef.chef_availability || null;
      const perDay = Number(availability?.max_bookings_per_day) || 1;
      return load < perDay;
    })
    .map((chef) => ({ chef, score: scoreChef(chef, booking, cuisineList) }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      success: false,
      error: "Every eligible chef is already booked that day.",
    };
  }

  // Try candidates in order. The first conditional update that reports a row
  // wins; a zero-row update means another request took the booking first.
  for (const candidate of scored) {
    if (candidate.score <= 0) continue;

    const assignedAt = new Date().toISOString();
    // `assigned_at` is missing on some deployments; a drifted column must not
    // stop the whole assignment.
    const { data: claimed, error: updateError } = await runWithSchemaFallback(
      {
        chef_id: candidate.chef.id,
        status: "assigned",
        assigned_at: assignedAt,
        chef_response_at: null,
      },
      (payload) =>
        supabase
          .from("bookings")
          .update(payload)
          .eq("id", bookingId)
          .eq("status", "pending_assignment")
          .is("chef_id", null)
          .select("id")
    );

    if (updateError) {
      return { success: false, error: "Failed to assign chef." };
    }
    if (!claimed || claimed.length === 0) {
      return {
        success: false,
        error: "Another process assigned this booking first.",
      };
    }

    await safeDispatchLog(supabase, {
      booking_id: bookingId,
      chef_id: candidate.chef.id,
      event: "auto_assigned",
      score: candidate.score,
      reason: cuisineList.length
        ? `Cuisine set: ${cuisineList.join(", ")}`
        : "No cuisine preference",
      metadata: { auto_assigned: true },
    });

    if (candidate.chef.user_id) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            recipient_id: candidate.chef.user_id,
            type: "booking_requested",
            title: "New job offered to you",
            message: `A ${booking.cuisine_type || "private dining"} request for ${
              booking.booking_date
            } in ${booking.location_city || "Nairobi"} is waiting for your response.`,
            entity_type: "booking",
            entity_id: bookingId,
          },
        ]);
      if (notificationError) {
        console.warn(
          "[dispatch] In-app notification failed (non-fatal):",
          notificationError.message
        );
      }
    }

    if (candidate.chef.phone) {
      const ref = bookingId.slice(0, 8).toUpperCase();
      const { amount: payout, resolution } = await estimateChefPayout(
        supabase,
        Number(booking.total_price || 0)
      );
      await notifyChefOfNewRequest({
        supabase,
        bookingId,
        reference: ref,
        chefName: candidate.chef.name,
        chefPhone: candidate.chef.phone,
        details: {
          date: String(booking.booking_date),
          guests: Number(booking.guests_count || 0),
          location: String(
            booking.location_address || booking.location_city || "Nairobi"
          ),
          cuisine: String(booking.cuisine_type || "Any"),
          payout,
          payoutIsIndicative: resolution.isIndicative,
        },
      }).catch((err) =>
        console.warn("[dispatch] WhatsApp notify failed (non-fatal):", err)
      );
    }

    return {
      success: true,
      chef_id: candidate.chef.id,
      chef_name: candidate.chef.name,
      match_score: candidate.score,
    };
  }

  return { success: false, error: "No suitable chef match found." };
}
