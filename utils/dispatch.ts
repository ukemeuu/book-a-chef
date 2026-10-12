import { createClient } from "@/utils/supabase/server";
import { notifyChefOfNewRequest } from "@/utils/whatsapp-notify";
import { estimateChefPayout } from "@/utils/commission";

/**
 * Shared dispatch matching logic.
 * Finds and assigns the best available chef for a pending_assignment booking.
 * Used by both the /api/dispatch/match endpoint and the bookings/create route.
 */
export async function matchChefToBooking(supabase: ReturnType<typeof createClient>, bookingId: string): Promise<{
  success: boolean;
  chef_id?: string;
  chef_name?: string;
  match_score?: number;
  error?: string;
}> {
  // 1. Fetch the booking
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  if (booking.status !== "pending_assignment") {
    return { success: false, error: `Booking is already in '${booking.status}' state.` };
  }

  // 2. Find matching chefs
  const { data: chefs, error: cErr } = await supabase
    .from("chefs")
    .select("*, chef_availability(*)")
    .eq("verified", true)
    .eq("is_available", true);

  if (cErr || !chefs || chefs.length === 0) {
    return { success: false, error: "No available chefs found." };
  }

  // 3. Score chefs by match quality
  const scored = chefs.map((chef) => {
    let score = 0;

    // Cuisine match (0-40 points)
    //
    // Scores against the FULL multi-select set, not just the primary choice.
    // The request form collects several cuisines per booking; a chef who covers
    // any of them is a genuine match, and previously only cuisine_type[0] was
    // ever considered, so a guest asking for "Italian and Seafood" was scored
    // against Italian alone.
    //
    // A chef matching every requested cuisine outranks one matching a single
    // cuisine, which is the intent of a multi-select field.
    const requestedCuisines: string[] =
      Array.isArray((booking as any).cuisine_types) && (booking as any).cuisine_types.length
        ? (booking as any).cuisine_types
        : booking.cuisine_type
        ? [booking.cuisine_type]
        : [];

    if (requestedCuisines.length > 0) {
      const chefCuisines: string[] = chef.cuisines || [];

      // "Any" means the guest has no cuisine preference — the chef matching at
      // all is the match, so award full marks rather than scoring against a
      // literal "Any" that no chef will ever list.
      if (requestedCuisines.includes("Any")) {
        score += 40;
      } else {
        const directHits = requestedCuisines.filter((c) =>
          chefCuisines.includes(c)
        );

        if (directHits.length > 0) {
          // 40 for covering everything requested, 32 for most of it, 25 for one.
          if (directHits.length >= requestedCuisines.length) score += 40;
          else if (directHits.length >= 2) score += 32;
          else score += 25;

          // Related-cuisine credit on top, for chefs adjacent to what was asked.
          const relatedMap: Record<string, string[]> = {
            Swahili: ["Seafood", "Coastal Fusion"],
            Seafood: ["Swahili", "Coastal Fusion"],
            BBQ: ["Nyama Choma", "Kenyan Traditional"],
            "Nyama Choma": ["BBQ", "Kenyan Traditional"],
            Italian: ["Continental", "Fine Dining"],
            Continental: ["Italian", "Fine Dining"],
            "Fine Dining": ["Continental", "Italian"],
            Indian: ["Pan-Asian"],
            "Pan-Asian": ["Indian"],
            Vegan: ["Vegetarian"],
            Vegetarian: ["Vegan"],
          };
          const relatedHit = requestedCuisines.some((c) =>
            (relatedMap[c] || []).some((r) => chefCuisines.includes(r))
          );
          if (relatedHit) score += 8;
        }
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
        score -= 20;
      }
    }

    return { chef, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.score <= 0) {
    return { success: false, error: "No suitable chef match found." };
  }

  // 4. Assign the chef
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      chef_id: best.chef.id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateErr) {
    return { success: false, error: "Failed to assign chef." };
  }

  // 5. Log the dispatch
  await supabase.from("dispatch_log").insert([
    {
      booking_id: bookingId,
      chef_id: best.chef.id,
      match_score: best.score,
      auto_assigned: true,
    },
  ]);

  // 6. Notify the chef (in-app) and over WhatsApp
  if (best.chef.user_id) {
    await supabase.from("notifications").insert([
      {
        recipient_id: best.chef.user_id,
        type: "booking_requested",
        title: "New Booking Available",
        message: `A new ${booking.cuisine_type || "dining"} request is available for ${booking.booking_date} in ${booking.location_city}. Log in to accept or decline.`,
        entity_type: "booking",
        entity_id: bookingId,
      },
    ]);
  }

  if (best.chef.phone) {
    const ref = bookingId.length > 8 ? bookingId.slice(0, 8).toUpperCase() : bookingId;
    // Payout is indicative until a commission rate is approved and activated
    // in platform_settings. Never hardcode the split at the call site.
    const { amount: payout, resolution } = await estimateChefPayout(
      supabase,
      Number(booking.total_price || 0)
    );
    await notifyChefOfNewRequest({
      supabase,
      bookingId,
      reference: ref,
      chefName: best.chef.name,
      chefPhone: best.chef.phone,
      details: {
        date: String(booking.booking_date),
        guests: Number(booking.guests_count || 0),
        location: String(booking.location_address || booking.location_city || "Nairobi"),
        cuisine: String(booking.cuisine_type || "Any"),
        payout,
        payoutIsIndicative: resolution.isIndicative,
      },
    });
  }

  return {
    success: true,
    chef_id: best.chef.id,
    chef_name: best.chef.name,
    match_score: best.score,
  };
}
