import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Reads session cookies for RLS-scoped booking lookup — must never be prerendered.
export const dynamic = "force-dynamic";

/**
 * Dispatch status endpoint.
 * GET /api/dispatch/status?booking_id=xxx
 * Returns current booking status and assigned chef details (if any).
 * Used by the request/status page for live polling.
 *
 * SECURITY: the response includes the chef's phone number, so it is only
 * returned to the booking's client, the assigned chef, or an admin. A booking
 * id is hard to guess, but "hard to guess" is not an access control.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const bookingId = request.nextUrl.searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json({ error: "booking_id query parameter is required." }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Fetch booking with chef details
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select(
        "id, status, chef_id, client_id, client_email, chefs(name, avatar_url, phone, cuisines, rating)"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr) {
      console.error("[dispatch/status] Lookup error:", bErr.message);
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Authorise: booking owner, assigned chef, or admin.
    let allowed =
      booking.client_id === user.id ||
      (!!booking.client_email && booking.client_email === user.email);

    if (!allowed) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      allowed = profile?.role === "admin";
    }

    if (!allowed && booking.chef_id) {
      const { data: chefRow } = await supabase
        .from("chefs")
        .select("user_id")
        .eq("id", booking.chef_id)
        .maybeSingle();

      allowed = !!chefRow?.user_id && chefRow.user_id === user.id;
    }

    if (!allowed) {
      return NextResponse.json({ error: "You cannot view this booking." }, { status: 403 });
    }

    // chefs comes back as an array from the join — extract the first element
    const chefData = Array.isArray(booking.chefs) ? booking.chefs[0] : booking.chefs;

    // Also fetch the latest dispatch log entry if assigned. `dispatch_log` is
    // absent on some deployments; a missing audit table must not fail status
    // polling.
    let dispatchInfo = null;
    if (booking.chef_id) {
      try {
        const { data: logEntry } = await supabase
          .from("dispatch_log")
          .select("matched_at, match_score, auto_assigned")
          .eq("booking_id", bookingId)
          .order("matched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        dispatchInfo = logEntry ?? null;
      } catch {
        dispatchInfo = null;
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        chef_id: booking.chef_id,
      },
      chef: chefData
        ? {
            name: chefData.name,
            avatar_url: chefData.avatar_url,
            phone: chefData.phone,
            cuisines: chefData.cuisines,
            rating: chefData.rating,
          }
        : null,
      dispatch: dispatchInfo,
    });
  } catch (err: any) {
    console.error("[dispatch/status] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
