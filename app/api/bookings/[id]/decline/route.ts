import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { matchChefToBooking } from "@/utils/dispatch";

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
    const declineReason = body.reason || "Chef is unavailable for this date/time.";

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, chefs(user_id, name)")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const isChef = booking.chefs?.user_id === user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isChef && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized to decline this booking." }, { status: 403 });
    }

    // If this was an unassigned booking that a chef was claiming, reset to pending_assignment
    // so another chef can claim it
    const wasUnassigned = !booking.chef_id && booking.status === "pending_assignment";

    const newStatus = wasUnassigned ? "pending_assignment" : "declined";

    const updatePayload: Record<string, any> = {
      status: newStatus,
      cancellation_reason: declineReason,
      chef_response_at: new Date().toISOString(),
    };

    // If resetting to pending_assignment, clear the chef_id
    if (wasUnassigned) {
      updatePayload.chef_id = null;
      updatePayload.assigned_at = null;
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update booking status." }, { status: 500 });
    }

    // Log the decline in dispatch_log
    const { data: chefRecord } = await supabase
      .from("chefs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (chefRecord) {
      await supabase.from("dispatch_log").insert([
        {
          booking_id: bookingId,
          chef_id: chefRecord.id,
          auto_assigned: false,
          declined_at: new Date().toISOString(),
          decline_reason: declineReason,
        },
      ]);
    }

    // If resetting to pending_assignment, trigger re-matching
    if (wasUnassigned) {
      // Fire-and-forget re-matching
      matchChefToBooking(supabase, bookingId).catch((err) => {
        console.warn("[bookings/decline] Re-matching failed:", err);
      });
    }

    // Notify client (only if fully declined, not if resetting)
    if (!wasUnassigned && booking.client_id) {
      await supabase.from("notifications").insert([
        {
          recipient_id: booking.client_id,
          type: "booking_declined",
          title: "Booking Request Update",
          message: `${booking.chefs?.name || "The chef"} was unable to accept your request for ${booking.booking_date}. Reason: ${declineReason}. We invite you to explore other available chefs.`,
          entity_type: "booking",
          entity_id: bookingId,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: wasUnassigned
        ? "Booking reset to pending_assignment. Re-matching with another chef."
        : "Booking request declined.",
      status: newStatus,
    });
  } catch (err: any) {
    console.error("[bookings/decline] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
