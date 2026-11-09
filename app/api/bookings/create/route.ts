import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { matchChefToBooking } from "@/utils/dispatch";
import { notifyRequestReceived } from "@/utils/whatsapp-notify";
import { runWithSchemaFallback } from "@/utils/schemaFallback";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/create
 *
 * Creates a chef request and hands it to the dispatch engine.
 *
 * Two things this route used to do that made the whole platform look healthy
 * while nothing worked:
 *   1. It inserted columns that did not exist on the live table. PostgREST
 *      rejected the entire insert, the catch block swallowed the error, and the
 *      API returned a fabricated `BAC-123456` reference with HTTP 201. The
 *      customer saw "request received"; no booking existed.
 *   2. It let the client choose `status`. Anything could create a booking in
 *      any state, including `confirmed` without payment.
 *
 * Now: authentication is required, status is derived server-side, unknown
 * columns are folded into `dispatch_notes` instead of being dropped, and a
 * failed insert returns a real error.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Please sign in so we can attach this request to your account.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
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
    } = body || {};

    // Accept either field name. The request form sends both, but older clients
    // and the proposals flow have used `cuisine_preference`.
    const cuisine_type = requestedCuisine || cuisine_preference;

    const cuisineList: string[] = (
      Array.isArray(cuisine_types) && cuisine_types.length
        ? cuisine_types
        : cuisine_type
        ? [cuisine_type]
        : []
    ).filter((value: unknown): value is string => typeof value === "string" && !!value.trim());

    const occasionList: string[] = Array.isArray(occasion_types)
      ? occasion_types.filter((value: unknown): value is string => typeof value === "string" && !!value.trim())
      : [];

    const dietaryList: string[] = Array.isArray(dietary_requirements)
      ? dietary_requirements.filter((value: unknown): value is string => typeof value === "string" && !!value.trim())
      : [];

    if (!booking_date || !guests_count || !location_address) {
      return NextResponse.json(
        {
          error:
            "Please fill in all required fields: date, guests, and event location.",
        },
        { status: 400 }
      );
    }

    if (!String(client_name || "").trim() || !String(client_phone || "").trim()) {
      return NextResponse.json(
        {
          error:
            "Please provide your name and phone/WhatsApp number so our concierge can reach you.",
        },
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

    const requestedDate = new Date(booking_date);
    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: "That booking date could not be read. Pick a date again." },
        { status: 400 }
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return NextResponse.json(
        { error: "The event date is in the past. Choose an upcoming date." },
        { status: 400 }
      );
    }

    // Resolve chef and menu pricing server-side. A client-supplied price is
    // never trusted: the booking total must come from the chef's rate.
    let chefName = chef_id ? "Book A Chef Culinary Master" : "Matching you with a chef";
    let startingPrice = Number(budget_per_person) || 4500;
    let menuPricePerGuest: number | null = null;
    let menuTitle: string | null = null;

    if (chef_id) {
      const { data: dbChef } = await supabase
        .from("chefs")
        .select("id, name, price_per_guest, user_id")
        .eq("id", chef_id)
        .maybeSingle();

      if (!dbChef) {
        return NextResponse.json(
          { error: "That chef is no longer available. Submit without a chef and we will match you." },
          { status: 400 }
        );
      }
      if (!dbChef.user_id) {
        // A listing with no login can never accept. Offering it would strand
        // the request exactly like the production ghosts did.
        return NextResponse.json(
          {
            error:
              "That chef cannot take requests right now. Submit without a chef and we will match you with an available one.",
          },
          { status: 409 }
        );
      }
      chefName = dbChef.name;
      startingPrice = Number(dbChef.price_per_guest) || 4500;

      if (menu_id) {
        const { data: dbMenu } = await supabase
          .from("menus")
          .select("id, title, price_per_guest, chef_id")
          .eq("id", menu_id)
          .maybeSingle();

        if (dbMenu && (!dbMenu.chef_id || dbMenu.chef_id === chef_id)) {
          menuPricePerGuest = Number(dbMenu.price_per_guest);
          menuTitle = dbMenu.title;
        }
      }
    }

    const finalPricePerGuest = menuPricePerGuest || startingPrice;
    const totalPrice = finalPricePerGuest * numGuests;
    const depositAmount = totalPrice;

    const serviceFormatText =
      service_format === "delivery"
        ? "Cooked & Delivered (Drop-off)"
        : "In-Home Private Dining";
    const sourcingText =
      sourcing_preference === "client_specified"
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

    // Status is derived, never taken from the request body.
    //   chef chosen  -> that chef must accept      -> 'assigned'
    //   no chef      -> dispatch engine picks one  -> 'pending_assignment'
    const bookingStatus = chef_id ? "assigned" : "pending_assignment";

    // Extended matching facets live in their own columns once migration 04 is
    // applied. Until then they survive in dispatch_notes as JSON, so dispatch
    // can still read them rather than losing the cuisine entirely.
    const dispatchNotes = JSON.stringify({
      v: 1,
      cuisines: cuisineList,
      occasions: occasionList,
      dietaries: dietaryList,
      notes: typeof special_requests === "string" ? special_requests : "",
    });

    const bookingPayload: Record<string, any> = {
      client_id: user.id,
      chef_id: chef_id || null,
      menu_id: menu_id || null,
      client_name: String(client_name).trim(),
      client_email: String(client_email || "").trim() || user.email || null,
      client_phone: String(client_phone).trim(),
      booking_date,
      booking_time: booking_time || "19:00 (Dinner)",
      guests_count: numGuests,
      location_address: String(location_address).trim(),
      location_city: location_city || "Nairobi",
      special_requests: formattedRequests,
      dietary_notes: dietary_notes?.trim() || null,
      cuisine_type: cuisine_type || null,
      cuisine_types: cuisineList.length ? cuisineList : null,
      occasion_types: occasionList.length ? occasionList : null,
      dietary_requirements: dietaryList.length ? dietaryList : null,
      budget_per_person:
        budget_per_person != null ? Number(budget_per_person) : null,
      dispatch_notes: dispatchNotes,
      service_format,
      sourcing_preference,
      preferred_stores: preferred_stores?.trim() || null,
      receipt_verified: false,
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: false,
      status: bookingStatus,
      ...(chef_id ? { assigned_at: new Date().toISOString() } : {}),
    };

    const { data: newBooking, error: insertError, dropped } =
      await runWithSchemaFallback(bookingPayload, (cleanPayload) =>
        supabase.from("bookings").insert([cleanPayload]).select().single()
      );

    if (insertError || !newBooking) {
      console.error("[bookings/create] Insert failed:", insertError, {
        dropped,
        user: user.id,
      });
      return NextResponse.json(
        {
          error:
            "We could not save your request. Nothing was charged. Please try again, or message our concierge on WhatsApp and we will place it for you.",
          code: "BOOKING_WRITE_FAILED",
        },
        { status: 500 }
      );
    }

    const createdId: string = newBooking.id;
    const cleanRef = createdId.slice(0, 8).toUpperCase();

    // Notifications and dispatch are fire-and-forget: neither may fail the
    // customer's request after the row is committed.
    notifyRequestReceived(
      {
        supabase,
        bookingId: createdId,
        reference: cleanRef,
        customerName: String(client_name).trim(),
        customerPhone: String(client_phone).trim(),
      },
      {
        date: String(booking_date),
        guests: numGuests,
        location: String(location_city || "Nairobi"),
        cuisine: cuisine_type || cuisineList.join(", ") || "Any",
      }
    ).catch((err) =>
      console.warn("[bookings/create] Request-received notification failed:", err)
    );

    if (!chef_id && bookingStatus === "pending_assignment") {
      matchChefToBooking(supabase, createdId).catch((err) => {
        console.warn(
          "[bookings/create] Auto-matching failed (request stays open):",
          err
        );
      });
    }

    // Best-effort audit. A missing audit_logs table must not hide a booking.
    try {
      await supabase.from("audit_logs").insert([
        {
          action: "booking_created",
          actor_id: user.id,
          entity_type: "booking",
          entity_id: createdId,
          metadata: {
            chef_name: chefName,
            total_price: totalPrice,
            date: booking_date,
            dropped_fields: dropped,
          },
        },
      ]);
    } catch {}

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
          chef_id: chef_id || null,
          client_name: String(client_name).trim(),
          client_phone: String(client_phone).trim(),
        },
        whatsapp_url: null,
        dropped_fields: dropped,
        message: chef_id
          ? "Request sent to the chef. We'll confirm as soon as they accept."
          : "Request received. We're matching you with a chef now.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[bookings/create] Unexpected error:", err);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred. Please try again or chat directly with our concierge on WhatsApp.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
