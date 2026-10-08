import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const bookingId = params.id;

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // 2. Fetch booking and chef info
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, chefs(user_id, name, phone)")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 3. Verify user is the assigned chef, an admin, or claiming an unassigned booking
    const isAssignedChef = booking.chefs?.user_id === user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const isChefRole = profile?.role === "chef";

    // Allow claiming unassigned pending_assignment bookings
    const canClaim = isChefRole && booking.status === "pending_assignment" && !booking.chef_id;

    if (!isAssignedChef && !isAdmin && !canClaim) {
      return NextResponse.json({ error: "Unauthorized to accept this booking." }, { status: 403 });
    }

    // For assigned bookings, only allow accepting from "pending" state
    // For unassigned bookings, only allow claiming from "pending_assignment" state
    if (isAssignedChef || isAdmin) {
      if (booking.status !== "pending") {
        return NextResponse.json(
          { error: `Booking is currently in '${booking.status}' state and cannot be accepted.` },
          { status: 400 }
        );
      }
    } else if (canClaim) {
      if (booking.status !== "pending_assignment") {
        return NextResponse.json(
          { error: `Booking is currently in '${booking.status}' state and cannot be claimed.` },
          { status: 400 }
        );
      }
    }

    // 4. Update status to chef_accepted (and set chef_id if claiming)
    const updatePayload: Record<string, any> = {
      status: "chef_accepted",
      chef_response_at: new Date().toISOString(),
    };

    if (canClaim) {
      // Look up the chef record for this user
      const { data: chefRecord } = await supabase
        .from("chefs")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (chefRecord) {
        updatePayload.chef_id = chefRecord.id;
        updatePayload.assigned_at = new Date().toISOString();
      }
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update booking status." }, { status: 500 });
    }

    // 5. Log dispatch if this was a claim
    if (canClaim) {
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
            accepted_at: new Date().toISOString(),
          },
        ]);
      }
    }

    // 6. Notify client
    const chefName = booking.chefs?.name || "A chef";
    if (booking.client_id) {
      await supabase.from("notifications").insert([
        {
          recipient_id: booking.client_id,
          type: "booking_accepted",
          title: "Chef Accepted Your Booking Request!",
          message: `${chefName} has accepted your booking for ${booking.booking_date}. Please complete the full culinary fee payment via M-Pesa to confirm and connect directly with your chef.`,
          entity_type: "booking",
          entity_id: bookingId,
        },
      ]);
    }

    // 7. Generate WhatsApp handoff link for the client
    const cleanRef = bookingId.length > 8 ? bookingId.slice(0, 8).toUpperCase() : bookingId;
    const whatsappMessage = `Hi Book A Chef Concierge! ${chefName} has accepted my booking for ${booking.booking_date} (Ref: #${cleanRef}). I'd like to confirm and discuss the next steps!`;
    const whatsappUrl = `https://wa.me/254786530713?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json({
      success: true,
      message: "Booking accepted. Client notified to complete full culinary fee payment.",
      status: "chef_accepted",
      whatsapp_url: whatsappUrl,
    });
  } catch (err: any) {
    console.error("[bookings/accept] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
