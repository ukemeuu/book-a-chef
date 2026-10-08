import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Dispatch matching endpoint.
 * Finds the best available chef for a pending_assignment booking.
 * Can be called internally (fire-and-forget from bookings/create) or manually.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required." }, { status: 400 });
    }

    // 1. Fetch the booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status !== "pending_assignment") {
      return NextResponse.json(
        { error: `Booking is already in '${booking.status}' state.` },
        { status: 400 }
      );
    }

    // 2. Find matching chefs
    const { data: chefs, error: cErr } = await supabase
      .from("chefs")
      .select("*, chef_availability(*)")
      .eq("verified", true)
      .eq("is_available", true);

    if (cErr || !chefs || chefs.length === 0) {
      return NextResponse.json(
        { error: "No available chefs found for this request." },
        { status: 404 }
      );
    }

    // 3. Score chefs by match quality
    const scored = chefs.map((chef) => {
      let score = 0;

      // Cuisine match (0-40 points)
      if (booking.cuisine_type && chef.cuisines?.includes(booking.cuisine_type)) {
        score += 40;
      } else if (booking.cuisine_type) {
        // Partial match — check for related cuisines
        const relatedMap: Record<string, string[]> = {
          "Swahili": ["Seafood", "Coastal Fusion"],
          "Seafood": ["Swahili", "Coastal Fusion"],
          "BBQ": ["Nyama Choma", "Kenyan Traditional"],
          "Nyama Choma": ["BBQ", "Kenyan Traditional"],
          "Italian": ["Continental", "Fine Dining"],
          "Continental": ["Italian", "Fine Dining"],
          "Fine Dining": ["Continental", "Italian"],
          "Indian": ["Pan-Asian"],
          "Pan-Asian": ["Indian"],
          "Vegan": ["Vegetarian"],
          "Vegetarian": ["Vegan"],
        };
        const related = relatedMap[booking.cuisine_type] || [];
        if (related.some((r) => chef.cuisines?.includes(r))) {
          score += 20;
        }
      }

      // Location match (0-30 points)
      if (booking.location_city && chef.city?.toLowerCase().includes(booking.location_city.toLowerCase())) {
        score += 30;
      } else if (booking.location_address && chef.service_areas?.some((area: string) =>
        booking.location_address.toLowerCase().includes(area.toLowerCase())
      )) {
        score += 25;
      }

      // Budget fit (0-20 points)
      if (booking.budget_per_person) {
        const chefPrice = Number(chef.price_per_guest) || 4500;
        const budget = Number(booking.budget_per_person);
        if (chefPrice <= budget) {
          score += 20;
        } else if (chefPrice <= budget * 1.2) {
          score += 10;
        }
      }

      // Rating bonus (0-10 points)
      score += (Number(chef.rating) || 5) * 2;

      // Availability check (0-10 points)
      const avail = chef.chef_availability?.[0];
      if (avail) {
        const bookingDay = new Date(booking.booking_date).getDay();
        if (avail.working_days?.includes(bookingDay)) {
          score += 10;
        }
        const minNotice = avail.min_notice_hours || 48;
        const hoursUntil = (new Date(booking.booking_date).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < minNotice) {
          score -= 20; // Penalty for short notice
        }
      }

      return { chef, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score <= 0) {
      return NextResponse.json(
        { error: "No suitable chef match found. Concierge will assign manually." },
        { status: 404 }
      );
    }

    // 4. Assign the chef
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        chef_id: best.chef.id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to assign chef." }, { status: 500 });
    }

    // 5. Log the dispatch
    await supabase.from("dispatch_log").insert([
      {
        booking_id,
        chef_id: best.chef.id,
        match_score: best.score,
        auto_assigned: true,
      },
    ]);

    // 6. Notify the chef
    const { data: chefProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", best.chef.user_id)
      .single();

    if (chefProfile) {
      await supabase.from("notifications").insert([
        {
          recipient_id: chefProfile.id,
          type: "booking_requested",
          title: "New Booking Available",
          message: `A new ${booking.cuisine_type || "dining"} request is available for ${booking.booking_date} in ${booking.location_city}. Log in to accept or decline.`,
          entity_type: "booking",
          entity_id: booking_id,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Chef assigned successfully.",
      chef_id: best.chef.id,
      chef_name: best.chef.name,
      match_score: best.score,
    });
  } catch (err: any) {
    console.error("[dispatch/match] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
