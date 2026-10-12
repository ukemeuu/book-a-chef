import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { INITIAL_CHEFS } from "@/utils/data";
import { matchChefToBooking } from "@/utils/dispatch";
import { notifyRequestReceived } from "@/utils/whatsapp-notify";

// Concierge Model: Server-side dining inquiry creation.
// Diners do not need to sign in or create an account.
// All inquiries are received by Book A Chef's concierge team for confirmation.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Check if user is authenticated (optional)
    let user: any = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch {
      user = null;
    }

    // 2. Parse and validate required fields
    const body = await request.json();
    const {
      chef_id,
      menu_id,
      booking_date,
      booking_time,
      guests_count,
      location_address,
      location_city,
      special_requests,
      dietary_notes,
      client_name,
      client_phone,
      client_email,
      service_format = "in_home",
      sourcing_preference = "chef_sourced",
      preferred_stores,
      cuisine_type: requestedCuisine,
      cuisine_preference,
      cuisine_types,
      occasion_types,
      dietary_requirements,
      budget_per_person,
      status: requestedStatus,
    } = body;

    // Accept either field name. The request form sends both, but older
    // clients and the proposals flow have used `cuisine_preference`.
    const cuisine_type = requestedCuisine || cuisine_preference;

    // Full multi-select set, falling back to the primary choice so older
    // clients and pre-existing rows still produce a usable match set.
    const cuisineList: string[] =
      Array.isArray(cuisine_types) && cuisine_types.length
        ? cuisine_types
        : cuisine_type
        ? [cuisine_type]
        : [];

    const occasionList: string[] = Array.isArray(occasion_types)
      ? occasion_types.filter(Boolean)
      : [];

    const dietaryList: string[] = Array.isArray(dietary_requirements)
      ? dietary_requirements.filter(Boolean)
      : [];

    // Basic validation (chef_id is optional in Uber-style dispatch flow)
    if (!booking_date || !guests_count || !location_address) {
      return NextResponse.json(
        { error: "Please fill in all required fields: date, guests, and event location." },
        { status: 400 }
      );
    }

    if (!client_name?.trim() || !client_phone?.trim()) {
      return NextResponse.json(
        { error: "Please provide your name and phone/WhatsApp number so our concierge can reach you." },
        { status: 400 }
      );
    }

    const numGuests = Number(guests_count) || 4;
    if (numGuests < 1 || numGuests > 150) {
      return NextResponse.json(
        { error: "Guest count must be between 1 and 150." },
        { status: 400 }
      );
    }

    // 3. Resolve chef details (from DB, fallback catalog, or Concierge Dispatch)
    let chefName = chef_id ? "Book A Chef Culinary Master" : "Concierge Dispatch (Matching In Progress)";
    let startingPrice = Number(budget_per_person) || 4500;
    let menuPricePerGuest: number | null = null;
    let menuTitle: string | null = null;

    if (chef_id) {
      try {
        const { data: dbChef } = await supabase
          .from("chefs")
          .select("id, name, price_per_guest")
          .eq("id", chef_id)
          .single();

        if (dbChef) {
          chefName = dbChef.name;
          startingPrice = Number(dbChef.price_per_guest) || 4500;
        } else {
          const localChef = INITIAL_CHEFS.find((c) => c.id === chef_id);
          if (localChef) {
            chefName = localChef.name;
            startingPrice = localChef.startingPrice || 4500;
          }
        }

        if (menu_id) {
          const { data: dbMenu } = await supabase
            .from("menus")
            .select("id, title, price_per_guest")
            .eq("id", menu_id)
            .single();

          if (dbMenu) {
            menuPricePerGuest = Number(dbMenu.price_per_guest);
            menuTitle = dbMenu.title;
          }
        }
      } catch (err) {
        console.warn("[bookings/create] Chef resolution warning:", err);
      }
    }

    const finalPricePerGuest = menuPricePerGuest || startingPrice;
    const totalPrice = finalPricePerGuest * numGuests;
    const depositAmount = totalPrice;

    // Service format label
    const serviceFormatText = service_format === "delivery" ? "Cooked & Delivered (Drop-off)" : "In-Home Private Dining";
    const sourcingText = sourcing_preference === "client_specified"
      ? `Client Supplies Ingredients (${preferred_stores || "Self-Sourced"})`
      : "Chef Sources Fresh at Store Till (0% Markup)";

    const formattedRequests = [
      cuisine_type ? `[Cuisine: ${cuisine_type}]` : null,
      `[Service: ${serviceFormatText}]`,
      `[Sourcing: ${sourcingText}]`,
      menuTitle ? `[Menu: ${menuTitle}]` : null,
      special_requests?.trim() || null,
    ]
      .filter(Boolean)
      .join(" • ");

    // 4. Construct booking payload
    const bookingStatus = requestedStatus || (chef_id ? "pending" : "pending_assignment");
    const bookingPayload = {
      client_id: user?.id || null,
      chef_id: chef_id || null,
      menu_id: menu_id || null,
      client_name: client_name.trim(),
      client_email: client_email?.trim() || user?.email || "concierge-client@bookachef.co.ke",
      client_phone: client_phone.trim(),
      booking_date,
      booking_time: booking_time || "19:00 (Dinner)",
      guests_count: numGuests,
      location_address: location_address.trim(),
      location_city: location_city || "Nairobi",
      special_requests: formattedRequests,
      dietary_notes: dietary_notes?.trim() || null,
      // Persist these to their own columns.
      //
      // cuisine_type was previously only embedded in the special_requests text
      // and never written to the column. utils/dispatch.ts scores cuisine match
      // at 40 points — the largest single weight — off booking.cuisine_type, so
      // with the column always NULL the whole cuisine tier was dead and every
      // match ran on location, rating and availability alone.
      //
      // budget_per_person likewise arrived from the form but was discarded;
      // dispatch and the chef-dashboard payout estimate both read it.
      cuisine_type: cuisine_type || null,
      cuisine_types: cuisineList.length ? cuisineList : null,
      occasion_types: occasionList.length ? occasionList : null,
      dietary_requirements: dietaryList.length ? dietaryList : null,
      budget_per_person: budget_per_person != null ? Number(budget_per_person) : null,
      service_format,
      sourcing_preference,
      preferred_stores: preferred_stores?.trim() || null,
      receipt_verified: false,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: false,
      status: bookingStatus,
    };

    let createdId = `BAC-${Math.floor(100000 + Math.random() * 900000)}`;
    let bookingRecord = { ...bookingPayload, id: createdId };

    // 5. Insert into Supabase
    try {
      const { data: newBooking, error: insertError } = await supabase
        .from("bookings")
        .insert([bookingPayload])
        .select()
        .single();

      if (!insertError && newBooking) {
        createdId = newBooking.id;
        bookingRecord = newBooking;

        const cleanRef =
          createdId.length > 8 ? createdId.slice(0, 8).toUpperCase() : createdId;

        // Notify the customer their request is in (fire-and-forget —
        // never block or fail the response on a notification error).
        notifyRequestReceived(
          { supabase, bookingId: createdId, reference: cleanRef, customerName: client_name.trim(), customerPhone: client_phone.trim() },
          {
            date: String(booking_date),
            guests: numGuests,
            location: String(location_city || "Nairobi"),
            cuisine: String(cuisine_type || "Any"),
          }
        ).catch((err) =>
          console.warn("[bookings/create] Request-received notification failed:", err)
        );

        // Trigger dispatch matching (fire-and-forget — don't block response)
        if (!chef_id && bookingStatus === "pending_assignment") {
          matchChefToBooking(supabase, createdId).catch((err) => {
            console.warn("[bookings/create] Auto-matching failed (will retry via cron):", err);
          });
        }
      } else if (insertError) {
        console.warn("[bookings/create] Supabase insert note (continuing with reference):", insertError.message);
      }
    } catch (e) {
      console.warn("[bookings/create] Database insert handled gracefully:", e);
    }

    // 6. Audit log (best-effort)
    try {
      await supabase.from("audit_logs").insert([
        {
          action: "concierge_inquiry_created",
          actor_id: user?.id || null,
          entity_type: "booking",
          entity_id: createdId,
          metadata: {
            chef_name: chefName,
            client_name: client_name.trim(),
            client_phone: client_phone.trim(),
            total_price: totalPrice,
            date: booking_date,
          },
        },
      ]);
    } catch {}

    // 7. Format WhatsApp message link for direct concierge handoff
    const cleanRef = createdId.length > 8 ? createdId.slice(0, 8).toUpperCase() : createdId;
    const whatsappMessage = chef_id
      ? `Hi Book A Chef Concierge! I just submitted an inquiry for Chef ${chefName} on ${booking_date} for ${numGuests} guests in ${location_city || "Nairobi"} (Ref: #${cleanRef}). I'd like to confirm availability and discuss our custom menu!`
      : `Hi Book A Chef Concierge! I just submitted a chef request for ${numGuests} guests on ${booking_date} in ${location_city || "Nairobi"} (Ref: #${cleanRef}). Please match and dispatch a certified chef for our event!`;
    const whatsappUrl = `https://wa.me/254786530713?text=${encodeURIComponent(whatsappMessage)}`;

    return NextResponse.json(
      {
        success: true,
        reference: cleanRef,
        booking: {
          id: createdId,
          status: bookingStatus,
          total_price: totalPrice,
          deposit_amount: depositAmount,
          booking_date,
          booking_time: booking_time || "19:00 (Dinner)",
          chef_name: chefName,
          client_name: client_name.trim(),
          client_phone: client_phone.trim(),
        },
        whatsapp_url: whatsappUrl,
        message: "Your dining request has been received by our concierge. We will match you with a certified chef shortly.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[bookings/create] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again or chat directly with our concierge on WhatsApp." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
