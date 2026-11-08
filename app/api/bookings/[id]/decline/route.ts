import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { matchChefToBooking } from "@/utils/dispatch";
import { runWithSchemaFallback, safeDispatchLog } from "@/utils/schemaFallback";

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
    const declineReason =
      String(body.reason || "").trim() || "Chef is unavailable for this date.";

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, chefs(user_id, name)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const chefJoin = Array.isArray(booking.chefs) ? booking.chefs[0] : booking.chefs;
    const isChef = !!chefJoin?.user_id && chefJoin.user_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isChef && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized to decline this booking." },
        { status: 403 }
      );
    }

    // Three very different situations, previously collapsed into one:
    //
    //   assigned      the chef is turning down an OFFER. The job must go back
    //                 to the pool and be re-matched, otherwise the customer is
    //                 stranded with a chef who said no — which is exactly what
    //                 the old code did by leaving chef_id populated.
    //   accepted      the chef is cancelling CONFIRMED work. That is a
    //                 cancellation, not a decline, and the customer needs a
    //                 human follow-up.
    //   anything else the request is already closed or unassigned.

    const isOffer = booking.status === "assigned";
    const isCommitted = [
      "chef_accepted",
      "payment_pending",
      "confirmed",
      "en_route",
      "cooking",
      "in_progress",
    ].includes(booking.status);

    const updatePayload: Record<string, any> = {
      chef_response_at: new Date().toISOString(),
      cancellation_reason: declineReason,
    };

    let nextStatus: string;

    if (isOffer) {
      nextStatus = "pending_assignment";
      updatePayload.status = nextStatus;
      updatePayload.chef_id = null;
      updatePayload.assigned_at = null;
    } else if (isCommitted) {
      nextStatus = "cancelled_by_chef";
      updatePayload.status = nextStatus;
      updatePayload.cancelled_at = new Date().toISOString();
    } else {
      nextStatus = "declined";
      updatePayload.status = nextStatus;
    }

    // `cancellation_reason` / `cancelled_at` are absent on some deployments;
    // a drifted column must not stop a chef from declining.
    const { data: updatedRows, error: updateError } = await runWithSchemaFallback(
      updatePayload,
      (payload) => {
        let q = supabase.from("bookings").update(payload).eq("id", bookingId);
        if (isOffer && booking.chef_id) q = q.eq("chef_id", booking.chef_id);
        return q.select("id");
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update booking status." },
        { status: 500 }
      );
    }
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "This booking changed while you were responding. Reload the dashboard." },
        { status: 409 }
      );
    }

    const { data: chefRecord } = await supabase
      .from("chefs")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (chefRecord) {
      await safeDispatchLog(supabase, {
        booking_id: bookingId,
        chef_id: chefRecord.id,
        event: isOffer ? "offer_declined" : "booking_declined",
        reason: declineReason,
      });
    }

    if (isOffer) {
      // Fire-and-forget: the customer's request must not depend on the
      // re-match succeeding synchronously. It stays pending_assignment if this
      // finds nobody, and the admin console can assign by hand.
      matchChefToBooking(supabase, bookingId).catch((err) => {
        console.warn("[bookings/decline] Re-matching failed:", err);
      });
    }

    if ((isCommitted || !isOffer) && booking.client_id) {
      await supabase
        .from("notifications")
        .insert([
          {
            recipient_id: booking.client_id,
            type: "booking_declined",
            title: isCommitted ? "Your chef cancelled" : "Chef could not take the request",
            message: isCommitted
              ? `${chefJoin?.name || "Your chef"} cancelled your booking on ${booking.booking_date}. Our team will contact you to rebook. Reason: ${declineReason}.`
              : `We could not place your request for ${booking.booking_date} with that chef. We are finding another one.`,
            entity_type: "booking",
            entity_id: bookingId,
          },
        ])
        .then(({ error }) => {
          if (error) {
            console.warn("[bookings/decline] Client notification failed:", error.message);
          }
        });
    }

    return NextResponse.json({
      success: true,
      message: isOffer
        ? "Offer declined. We're finding another chef for this request."
        : isCommitted
        ? "Booking cancelled. Our team has been alerted."
        : "Booking declined.",
      status: nextStatus,
    });
  } catch (err: any) {
    console.error("[bookings/decline] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
