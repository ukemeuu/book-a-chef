import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { matchChefToBooking } from "@/utils/dispatch";

/**
 * POST /api/dispatch/match
 *
 * Manual or cron-triggered re-match for a single request.
 *
 * All scoring and assignment rules live in utils/dispatch.ts so this endpoint
 * and /api/bookings/create can never drift apart. This route previously held a
 * second, weaker copy of the algorithm: it did not require the chef to have a
 * login, did not check the calendar, and did not guard the assignment.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "");

    if (!bookingId) {
      return NextResponse.json(
        { error: "booking_id is required." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      // A chef or client may re-trigger matching for their own request only.
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, client_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (!booking || booking.client_id !== user.id) {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
    }

    const result = await matchChefToBooking(supabase as any, bookingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "No suitable chef found." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      chef_id: result.chef_id,
      chef_name: result.chef_name,
      match_score: result.match_score,
    });
  } catch (error: any) {
    console.error("[dispatch/match] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
