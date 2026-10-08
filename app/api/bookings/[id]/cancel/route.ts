import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const bookingId = params.id;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Customer requested cancellation.";

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, chefs(user_id, name)")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const isClient = booking.client_id === user.id || booking.client_email === user.email;
    const isChef = booking.chefs?.user_id === user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isClient && !isChef && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized to cancel this booking." }, { status: 403 });
    }

    // Cancellation Policy Engine
    const eventDate = new Date(booking.booking_date);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let nextStatus = "cancelled_by_customer";
    let refundEligibility = "No deposit paid yet.";
    let refundPercentage = 0;

    if (isChef) {
      nextStatus = "cancelled_by_chef";
      if (booking.deposit_paid) {
        refundPercentage = 100;
        refundEligibility = "100% full refund initiated due to chef cancellation.";
      }
    } else if (isClient) {
      nextStatus = "cancelled_by_customer";
      if (booking.deposit_paid) {
        if (hoursUntilEvent >= 72) {
          refundPercentage = 95; // 5% handling fee
          refundEligibility = "95% deposit refund (minus 5% handling fee) - Notice > 72 hours.";
        } else if (hoursUntilEvent >= 24) {
          refundPercentage = 50;
          refundEligibility = "50% deposit refund (50% retained for chef prep) - Notice 24-72 hours.";
        } else {
          refundPercentage = 0;
          refundEligibility = "0% refund - Cancellation within 24 hours (market ingredients purchased).";
        }
      }
    } else if (isAdmin) {
      nextStatus = "cancelled_by_customer";
      refundPercentage = 100;
      refundEligibility = "Admin override cancellation.";
    }

    // Update booking
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: nextStatus,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: `${reason} [Policy: ${refundEligibility}]`,
      })
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update booking status." }, { status: 500 });
    }

    // If refund is due, create refund record in payments
    if (refundPercentage > 0 && booking.deposit_paid) {
      const refundAmount = Math.round((Number(booking.deposit_amount) * refundPercentage) / 100);
      await supabase.from("payments").insert([
        {
          booking_id: bookingId,
          client_id: booking.client_id,
          amount: refundAmount,
          currency: "KES",
          payment_type: "refund",
          status: "pending",
          failure_reason: `Refund pending processing via M-Pesa. Eligibility: ${refundEligibility}`,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Booking cancelled. ${refundEligibility}`,
      status: nextStatus,
      refund_percentage: refundPercentage,
    });
  } catch (err: any) {
    console.error("[bookings/cancel] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
