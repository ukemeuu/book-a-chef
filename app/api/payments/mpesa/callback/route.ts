/**
 * M-Pesa Daraja Callback Handler
 *
 * Safaricom POSTs to this endpoint after STK Push completes.
 * This must be:
 * 1. Idempotent — Safaricom may call it more than once
 * 2. Fast — respond 200 within 5 seconds or Safaricom retries
 * 3. Server-authoritative — NEVER trust client for payment status
 */

import { NextRequest, NextResponse } from "next/server";
import { parseSTKCallback } from "@/utils/mpesa";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS for payment processing
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    // Fall back to anon key — payment insert will be blocked by RLS
    // This is a configuration error, not a code error
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  // Always respond 200 quickly — Safaricom interprets 4xx/5xx as failure and retries
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  }

  const callback = parseSTKCallback(body);
  const { checkoutRequestId } = callback;

  if (!checkoutRequestId) {
    console.error("[mpesa/callback] Missing CheckoutRequestID in callback");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  }

  try {
    const supabase = getServiceClient();

    // ── Idempotency check ──────────────────────────────────────────────────
    // If we already processed this callback, skip (prevents double-confirmation)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, callback_processed, booking_id")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .single();

    if (!existingPayment) {
      console.warn("[mpesa/callback] No payment record for CheckoutRequestID:", checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (existingPayment.callback_processed) {
      console.log("[mpesa/callback] Already processed:", checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    // ── Process payment result ─────────────────────────────────────────────
    if (callback.success) {
      // Payment succeeded — mark payment as completed
      await supabase
        .from("payments")
        .update({
          status: "completed",
          mpesa_receipt_number: callback.mpesaReceiptNumber,
          mpesa_transaction_date: callback.transactionDate,
          callback_processed: true,
          callback_received_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("mpesa_checkout_request_id", checkoutRequestId);

      // Update booking status to CONFIRMED and mark deposit paid
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString(),
        })
        .eq("id", existingPayment.booking_id);

      // Create notification for client
      const { data: booking } = await supabase
        .from("bookings")
        .select("client_id, chef_id, booking_date, chefs(name)")
        .eq("id", existingPayment.booking_id)
        .single();

      if (booking?.client_id) {
        await supabase.from("notifications").insert([
          {
            recipient_id: booking.client_id,
            type: "payment_received",
            title: "Payment Received — Booking Confirmed",
            message: `Your M-Pesa deposit of KES ${callback.amount?.toLocaleString()} has been received. Your dinner is confirmed!`,
            entity_type: "booking",
            entity_id: existingPayment.booking_id,
            metadata: {
              mpesa_receipt: callback.mpesaReceiptNumber,
              amount: callback.amount,
            },
          },
        ]);
      }

      // Audit log
      await supabase.from("audit_logs").insert([
        {
          action: "payment_completed",
          entity_type: "payment",
          entity_id: existingPayment.id,
          metadata: {
            mpesa_receipt: callback.mpesaReceiptNumber,
            amount: callback.amount,
            checkout_request_id: checkoutRequestId,
          },
        },
      ]);

      console.log("[mpesa/callback] Payment confirmed:", callback.mpesaReceiptNumber);
    } else {
      // Payment failed or cancelled by user
      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_reason: callback.resultDesc,
          callback_processed: true,
          callback_received_at: new Date().toISOString(),
        })
        .eq("mpesa_checkout_request_id", checkoutRequestId);

      // Revert booking to chef_accepted (awaiting retry)
      await supabase
        .from("bookings")
        .update({ status: "chef_accepted" })
        .eq("id", existingPayment.booking_id);

      console.log("[mpesa/callback] Payment failed:", callback.resultDesc);
    }
  } catch (err) {
    // Log but don't fail — always return 200 to Safaricom
    console.error("[mpesa/callback] Processing error:", err);
  }

  // Always return 200 — Safaricom treats non-200 as failure and retries
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
}

// Safaricom uses POST only
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
