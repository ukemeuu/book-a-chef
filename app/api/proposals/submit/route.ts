import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      name,
      email,
      phone,
      event_type,
      event_date,
      location,
      guest_count,
      budget_per_guest,
      cuisine_preference,
      dietary_notes,
      additional_details,
    } = body;

    if (!name || !email || !phone || !event_date || !guest_count || !location) {
      return NextResponse.json(
        { error: "Please fill in all required event proposal details." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const proposalRecord = {
      client_name: name.trim(),
      client_email: email.trim(),
      client_phone: phone.trim(),
      client_id: user?.id || null,
      booking_date: event_date,
      booking_time: "Custom Event Service",
      guests_count: Number(guest_count),
      location_address: location.trim(),
      location_city: "Nairobi",
      special_requests: `[PROPOSAL REQUEST - ${event_type}] Preferred Cuisines: ${cuisine_preference || "Custom"}. Budget/Guest: KES ${budget_per_guest || "Custom"}. Details: ${additional_details || "N/A"}`,
      dietary_notes: dietary_notes || null,
      total_price: Number(guest_count) * (Number(budget_per_guest) || 4500),
      deposit_amount: Math.round(Number(guest_count) * (Number(budget_per_guest) || 4500) * 0.15),
      status: "pending",
      // Pick first verified chef or concierge management
      chef_id: body.chef_id || "c_1",
    };

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert([proposalRecord])
      .select()
      .single();

    if (bErr || !booking) {
      console.error("[proposals/submit] Insert error:", bErr);
      return NextResponse.json(
        { error: "Unable to submit proposal request. Please try again." },
        { status: 500 }
      );
    }

    // Log admin notification
    try {
      await supabase.from("audit_logs").insert([
        {
          action: "proposal_requested",
          actor_id: user?.id || null,
          entity_type: "proposal",
          entity_id: booking.id,
          metadata: { name, email, guest_count, event_type, budget_per_guest },
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message:
        "Your proposal request has been received. Our concierge team and executive chefs will review your requirements and send a customized menu within 24 hours.",
      proposal_id: booking.id,
    });
  } catch (err: any) {
    console.error("[proposals/submit] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
