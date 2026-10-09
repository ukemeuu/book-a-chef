/**
 * Booking lifecycle notifications over WhatsApp.
 *
 * Maps domain events to pre-approved WhatsApp templates, sends them, and
 * records every attempt in `whatsapp_message_log` so failed sends can be
 * retried and audited.
 *
 * DESIGN RULES:
 *  - Notification failures NEVER block or fail the booking flow. Every
 *    function here swallows transport errors and records them instead.
 *  - Outbound messages use Meta-approved templates because we message
 *    customers outside the 24-hour service window.
 */

import { createClient } from "@/utils/supabase/server";
import {
  sendTemplateMessage,
  TEMPLATES,
  normalizePhone,
  type TemplateName,
} from "@/utils/whatsapp";

type SupabaseClient = ReturnType<typeof createClient>;

interface NotifyContext {
  supabase: SupabaseClient;
  bookingId: string;
  /** Short reference shown to humans, e.g. "BAC-4F2A1C". */
  reference: string;
  customerName: string;
  customerPhone: string;
}

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || "https://bookachef.co.ke";

/**
 * Persist an outbound message attempt.
 *
 * This is the retry ledger: rows with status 'failed' and no `delivered_at`
 * can be swept by a cron job or admin action.
 */
async function logAttempt(params: {
  supabase: SupabaseClient;
  bookingId: string | null;
  recipientPhone: string | null;
  recipientName: string | null;
  recipientRole: "customer" | "chef" | "concierge";
  template: TemplateName;
  body: string;
  parameters: string[];
  success: boolean;
  error?: string;
  messageId?: string;
}) {
  const {
    supabase,
    bookingId,
    recipientPhone,
    recipientName,
    recipientRole,
    template,
    body,
    parameters,
    success,
    error,
    messageId,
  } = params;

  try {
    // Upsert on the dedupe key (booking_id, template_name, recipient_phone)
    // so a repeated event retries the row instead of creating duplicates.
    await supabase.from("whatsapp_message_log").upsert(
      {
        booking_id: bookingId,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        recipient_role: recipientRole,
        template_name: template,
        message_body: body.slice(0, 2000),
        parameters,
        status: success ? "sent" : "failed",
        error_detail: error ? String(error).slice(0, 500) : null,
        whatsapp_message_id: messageId || null,
        sent_at: success ? new Date().toISOString() : null,
      },
      {
        onConflict: "booking_id,template_name,recipient_phone",
        ignoreDuplicates: false,
      }
    );
  } catch (err) {
    // Logging must never break the caller.
    console.warn("[whatsapp-notify] Failed to record message log:", err);
  }
}

/**
 * Send and log a template message in one step.
 */
async function dispatch(
  ctx: {
    supabase: SupabaseClient;
    bookingId: string | null;
    to: string | null;
    recipientName: string | null;
    recipientRole: "customer" | "chef" | "concierge";
  },
  template: TemplateName,
  parameters: string[],
  preview: string
) {
  const result = await sendTemplateMessage(ctx.to, template, parameters);

  await logAttempt({
    supabase: ctx.supabase,
    bookingId: ctx.bookingId,
    recipientPhone: normalizePhone(ctx.to),
    recipientName: ctx.recipientName,
    recipientRole: ctx.recipientRole,
    template,
    body: preview,
    parameters,
    success: result.success,
    error: result.error,
    messageId: result.messageId,
  });

  if (!result.success && !result.notConfigured) {
    console.warn(
      `[whatsapp-notify] ${template} to ${ctx.recipientName ?? "unknown"} failed: ${result.error}`
    );
  }

  return result;
}

// ── Customer-facing events ───────────────────────────────────────────────────

/**
 * Fired immediately after a booking row is created.
 * Tells the customer we have their request and are matching a chef.
 */
export async function notifyRequestReceived(
  ctx: NotifyContext,
  details: { date: string; guests: number; location: string; cuisine: string }
) {
  return dispatch(
    {
      supabase: ctx.supabase,
      bookingId: ctx.bookingId,
      to: ctx.customerPhone,
      recipientName: ctx.customerName,
      recipientRole: "customer",
    },
    TEMPLATES.REQUEST_RECEIVED,
    [ctx.customerName, ctx.reference, details.date, String(details.guests), details.location],
    `Hi ${ctx.customerName}, request ${ctx.reference} received for ${details.date} ` +
      `(${details.guests} guests, ${details.location}). We are finding you a chef. ` +
      `Track: ${SITE_URL()}/request/status?ref=${ctx.reference}`
  );
}

/**
 * Fired when the matching engine assigns a chef to the booking.
 */
export async function notifyChefAssigned(
  ctx: NotifyContext,
  details: { chefName: string; date: string }
) {
  return dispatch(
    {
      supabase: ctx.supabase,
      bookingId: ctx.bookingId,
      to: ctx.customerPhone,
      recipientName: ctx.customerName,
      recipientRole: "customer",
    },
    TEMPLATES.CHEF_ASSIGNED,
    [ctx.customerName, details.chefName, details.date, ctx.reference],
    `Hi ${ctx.customerName}, ${details.chefName} has been assigned to your booking ` +
      `${ctx.reference} on ${details.date}. Track: ${SITE_URL()}/request/status?ref=${ctx.reference}`
  );
}

/**
 * Fired when a chef accepts the assignment.
 * Includes the WhatsApp handoff link so the two parties can connect directly.
 */
export async function notifyChefAccepted(
  ctx: NotifyContext,
  details: { chefName: string; date: string; chefPhone?: string | null; totalPrice: number }
) {
  const handoff = buildHandoffLink(ctx.reference, details.chefName, details.date);

  return dispatch(
    {
      supabase: ctx.supabase,
      bookingId: ctx.bookingId,
      to: ctx.customerPhone,
      recipientName: ctx.customerName,
      recipientRole: "customer",
    },
    TEMPLATES.CHEF_ACCEPTED,
    [
      ctx.customerName,
      details.chefName,
      details.date,
      `KES ${details.totalPrice.toLocaleString()}`,
      handoff,
    ],
    `Hi ${ctx.customerName}, ${details.chefName} accepted your booking ${ctx.reference} ` +
      `on ${details.date}. Pay KES ${details.totalPrice.toLocaleString()} to confirm. ` +
      `Connect: ${handoff}`
  );
}

/**
 * Fired when the M-Pesa callback confirms payment.
 */
export async function notifyPaymentReceived(
  ctx: NotifyContext,
  details: { amount: number; receiptNumber?: string | null }
) {
  return dispatch(
    {
      supabase: ctx.supabase,
      bookingId: ctx.bookingId,
      to: ctx.customerPhone,
      recipientName: ctx.customerName,
      recipientRole: "customer",
    },
    TEMPLATES.PAYMENT_RECEIVED,
    [
      ctx.customerName,
      ctx.reference,
      `KES ${details.amount.toLocaleString()}`,
      details.receiptNumber || "—",
    ],
    `Hi ${ctx.customerName}, we received your payment of KES ${details.amount.toLocaleString()} ` +
      `for booking ${ctx.reference}. Your chef is confirmed.`
  );
}

// ── Chef-facing events ───────────────────────────────────────────────────────

/**
 * Fired when a new dispatch request is created.
 * Notifies chefs whose profile matches the request criteria.
 */
export async function notifyChefOfNewRequest(params: {
  supabase: SupabaseClient;
  bookingId: string;
  reference: string;
  chefName: string;
  chefPhone: string;
  details: { date: string; guests: number; location: string; cuisine: string; payout: number };
}) {
  const { supabase, bookingId, reference, chefName, chefPhone, details } = params;

  return dispatch(
    {
      supabase,
      bookingId,
      to: chefPhone,
      recipientName: chefName,
      recipientRole: "chef",
    },
    TEMPLATES.NEW_REQUEST,
    [
      chefName,
      details.cuisine,
      details.date,
      String(details.guests),
      details.location,
      `KES ${details.payout.toLocaleString()}`,
      reference,
    ],
    `Hi ${chefName}, new ${details.cuisine} request on ${details.date} for ` +
      `${details.guests} guests in ${details.location}. Payout KES ${details.payout.toLocaleString()}. ` +
      `Open your dashboard to accept.`
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a wa.me deep link the customer can use to open a chat with the
 * concierge about a specific booking.
 */
export function buildHandoffLink(
  reference: string,
  chefName: string,
  date: string
): string {
  const conciergeNumber =
    process.env.WHATSAPP_CONCIERGE_NUMBER || "254786530713";

  const text = encodeURIComponent(
    `Hi Book A Chef! ${chefName} accepted my booking #${reference} on ${date}. ` +
      `I'd like to confirm the details.`
  );

  return `https://wa.me/${conciergeNumber}?text=${text}`;
}