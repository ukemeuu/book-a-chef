import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Dispatch status endpoint.
 * GET /api/dispatch/status?booking_id=xxx
 * Returns current booking status and assigned chef details (if any).
 * Used by the request/status page for live polling.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const bookingId = request.nextUrl.searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json({ error: "booking_id query parameter is required." }, { status: 400 });
    }

    // Fetch booking with chef details
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, status, chef_id, chefs(name, avatar_url, phone, cuisines, rating)")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // chefs comes back as an array from the join — extract the first element
    const chefData = Array.isArray(booking.chefs) ? booking.chefs[0] : booking.chefs;

    // Also fetch the latest dispatch log entry if assigned
    let dispatchInfo = null;
    if (booking.chef_id) {
      const { data: logEntry } = await supabase
        .from("dispatch_log")
        .select("matched_at, match_score, auto_assigned")
        .eq("booking_id", bookingId)
        .order("matched_at", { ascending: false })
        .limit(1)
        .single();

      dispatchInfo = logEntry;
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        chef_id: booking.chef_id,
      },
      chef: chefData ? {
        name: chefData.name,
        avatar_url: chefData.avatar_url,
        phone: chefData.phone,
        cuisines: chefData.cuisines,
        rating: chefData.rating,
      } : null,
      dispatch: dispatchInfo,
    });
  } catch (err: any) {
    console.error("[dispatch/status] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
