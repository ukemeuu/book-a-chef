import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chefs
 *
 * Public marketplace listing. Returns verified chefs with their active menus.
 * Supports filtering by cuisine, location, price band, availability, and
 * free-text search, plus sorting.
 *
 * Query params:
 *   cuisine      — exact cuisine match (e.g. "Swahili")
 *   location     — city or service area (partial match)
 *   min_price    — minimum price per guest
 *   max_price    — maximum price per guest
 *   available    — "true" to only return chefs currently online
 *   featured     — "true" to only return featured chefs
 *   search       — free-text match on name, brand, tagline
 *   sort         — rating | price_asc | price_desc | reviews | newest
 *   limit        — page size (default 24, max 100)
 *   offset       — pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;

    const cuisine = searchParams.get("cuisine");
    const location = searchParams.get("location");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const available = searchParams.get("available");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "rating";
    const limit = Math.min(Number(searchParams.get("limit")) || 24, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    let query = supabase
      .from("chefs")
      .select("*, menus(*)")
      .eq("verified", true);

    // Cuisine filter — the column is a text array, so use `contains`.
    if (cuisine) {
      query = query.contains("cuisines", [cuisine]);
    }

    // Location filter — match city or any service area.
    if (location) {
      const term = location.trim();
      query = query.or(
        `city.ilike.%${term}%,service_areas.cs.{${term}}`
      );
    }

    // Price band.
    if (minPrice) {
      query = query.gte("price_per_guest", Number(minPrice));
    }
    if (maxPrice) {
      query = query.lte("price_per_guest", Number(maxPrice));
    }

    // Availability.
    if (available === "true") {
      query = query.eq("is_available", true);
    }

    // Featured.
    if (featured === "true") {
      query = query.eq("featured", true);
    }

    // Free-text search across name, brand, tagline.
    if (search) {
      const term = search.trim();
      query = query.or(
        `name.ilike.%${term}%,brand_name.ilike.%${term}%,tagline.ilike.%${term}%`
      );
    }

    // Sorting.
    switch (sort) {
      case "price_asc":
        query = query.order("price_per_guest", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price_per_guest", { ascending: false });
        break;
      case "reviews":
        query = query.order("reviews_count", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "rating":
      default:
        query = query.order("rating", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data: chefs, error } = await query;

    if (error) {
      console.error("[chefs] Query error:", error.message);
      return NextResponse.json(
        { error: "Could not load chefs. Please try again." },
        { status: 500 }
      );
    }

    // Filter out inactive menus from the embedded relation.
    const mapped = (chefs || []).map((chef: any) => ({
      ...chef,
      menus: (chef.menus || []).filter((m: any) => m.is_active !== false),
    }));

    return NextResponse.json({
      success: true,
      chefs: mapped,
      count: mapped.length,
      offset,
      limit,
    });
  } catch (err: any) {
    console.error("[chefs] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
