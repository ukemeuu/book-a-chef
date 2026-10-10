import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { notifyChefAccepted, buildHandoffLink } from "@/utils/whatsapp-notify";

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

    // 3. Verify the caller is the chef this job was dispatched to, or an admin.
    //
    // There is deliberately NO claim path. Dispatch is push: the matching engine
    // assigns exactly one chef, and only that chef may accept. This endpoint
    // previously also let any chef claim an unassigned `pending_assignment`
    // booking by ID, which (a) leaked client PII to whoever guessed the ID and
    // (b) bypassed the sequential one-chef-at-a-time matching rule.
    const isAssignedChef = booking.chefs?.user_id === user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isAssignedChef && !isAdmin) {
      return NextResponse.json(
        { error: "This job was not dispatched to you." },
        { status: 403 }
      );
    }

    // 4. Guard the transition. `assigned` is the state matchChefToBooking() sets
    // when it dispatches an offer; `pending` is the pre-pivot legacy state for
    // bookings assigned before the dispatch engine existed.
    const ACCEPTABLE_FROM = ["assigned", "pending"];

    if (!ACCEPTABLE_FROM.includes(booking.status)) {
      return NextResponse.json(
        {
          error:
            booking.status === "chef_accepted"
              ? "You have already accepted this job."
              : `This job is no longer available (status: ${booking.status}).`,
        },
        { status: 409 }
      );
    }

    if (!booking.chef_id) {
      return NextResponse.json(
        { error: "This job has no chef assigned. It may have been withdrawn." },
        { status: 409 }
      );
    }

    // 5. Conditional update — this is the B1 race fix.
    //
    // The previous version ran `.update(payload).eq("id", bookingId)`, a
    // read-then-write: two concurrent accepts both read `assigned`, both passed
    // the guard above, and the second silently overwrote the first's timestamps
    // while BOTH callers received HTTP 200.
    //
    // Folding the expected status into the WHERE clause makes the check and the
    // write one atomic statement. Exactly one caller can move a row out of
    // `assigned`; every other caller matches zero rows and gets a 409.
    //
    // This works against production as-is and does not depend on migration 03
    // having been applied. claim_booking() adds the further DB-side layers
    // (trigger + partial unique index); this is the app-level guard.
    const expectedStatus = booking.status;
    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: "chef_accepted",
        chef_response_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("status", expectedStatus)
      .select("id");

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update booking status." }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // Lost the race — another request already moved this booking on.
      return NextResponse.json(
        { error: "This job was just taken or updated. Please refresh." },
        { status: 409 }
      );
    }

    // 6. Record the acceptance in the dispatch log.
    await supabase.from("dispatch_log").insert([
      {
        booking_id: bookingId,
        chef_id: booking.chef_id,
        auto_assigned: true,
        accepted_at: new Date().toISOString(),
      },
    ]);

    // 7. Notify client (in-app)
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

    // 8. Generate WhatsApp handoff link for the client
    const cleanRef = bookingId.length > 8 ? bookingId.slice(0, 8).toUpperCase() : bookingId;
    const whatsappUrl = buildHandoffLink(cleanRef, chefName, String(booking.booking_date));

    // 9. Notify the customer over WhatsApp (fire-and-forget — a failed
    //    notification must not roll back a successful acceptance).
    notifyChefAccepted(
      {
        supabase,
        bookingId,
        reference: cleanRef,
        customerName: String(booking.client_name || "there"),
        customerPhone: String(booking.client_phone || ""),
      },
      {
        chefName,
        date: String(booking.booking_date),
        chefPhone: booking.chefs?.phone || null,
        totalPrice: Number(booking.total_price || 0),
      }
    ).catch((err) =>
      console.warn("[bookings/accept] Acceptance notification failed:", err)
    );

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
