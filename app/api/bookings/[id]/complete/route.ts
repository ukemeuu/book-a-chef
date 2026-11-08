import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runWithSchemaFallback } from "@/utils/schemaFallback";

/**
 * POST /api/bookings/[id]/complete
 *
 * A chef marks a served job as completed. Completion unlocks the customer's
 * review, so it must be:
 *   • authorised — only the assigned chef or an admin,
 *   • transition-safe — only from a live service state, and
 *   • schema-tolerant — `review_eligible` / `completed_at` are missing on some
 *     deployments, and writing an unknown column used to fail the WHOLE update,
 *     leaving the chef unable to close a job at all.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, chef_id, client_id, chefs(user_id, name)")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const chefRow = Array.isArray(booking.chefs) ? booking.chefs[0] : booking.chefs;
    let allowed = !!chefRow?.user_id && chefRow.user_id === user.id;

    if (!allowed) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      allowed = profile?.role === "admin";
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "Only the assigned chef can complete this job." },
        { status: 403 }
      );
    }

    const completable = [
      "confirmed",
      "en_route",
      "cooking",
      "in_progress",
      "chef_accepted",
    ];

    if (!completable.includes(String(booking.status))) {
      return NextResponse.json(
        {
          error:
            booking.status === "completed"
              ? "This job is already marked completed."
              : `This job cannot be completed from status '${booking.status}'.`,
        },
        { status: 409 }
      );
    }

    const { data: updated, error } = await runWithSchemaFallback(
      {
        status: "completed",
        completed_at: new Date().toISOString(),
        review_eligible: true,
      },
      (payload) =>
        supabase
          .from("bookings")
          .update(payload)
          .eq("id", bookingId)
          .eq("status", booking.status)
          .select("id, status")
          .maybeSingle()
    );

    if (error || !updated) {
      console.error("[bookings/complete] Update failed:", error);
      return NextResponse.json(
        { error: "Could not mark this job as completed. Please refresh and try again." },
        { status: error ? 500 : 409 }
      );
    }

    if (booking.client_id) {
      await supabase.from("notifications").insert([
        {
          recipient_id: booking.client_id,
          type: "booking_completed",
          title: "How was your dinner?",
          message: `${chefRow?.name || "Your chef"} has completed your booking. Leave a review to help other hosts.`,
          entity_type: "booking",
          entity_id: bookingId,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      status: "completed",
      message: "Job marked complete. The client can now leave a review.",
    });
  } catch (err: any) {
    console.error("[bookings/complete] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
