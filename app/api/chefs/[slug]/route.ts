import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chefs/[slug]
 *
 * Public chef profile: the listing, active menus, recent reviews, availability
 * and blocked dates. Only verified chefs are returned — an unverified listing
 * must never be publicly addressable.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();
    const { slug } = params;

    const { data: chef, error } = await supabase
      .from("chefs")
      .select("*, menus(*)")
      .eq("slug", slug)
      .eq("verified", true)
      .maybeSingle();

    if (error) {
      console.error("[chefs/[slug]] Query error:", error.message);
      return NextResponse.json(
        { error: "Could not load this chef." },
        { status: 500 }
      );
    }

    if (!chef) {
      return NextResponse.json({ error: "Chef not found." }, { status: 404 });
    }

    // Recent reviews (public).
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("chef_id", chef.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Availability settings.
    const { data: availability } = await supabase
      .from("chef_availability")
      .select("*")
      .eq("chef_id", chef.id)
      .maybeSingle();

    // Blocked dates (only the date and reason are public).
    const { data: blockedDates } = await supabase
      .from("chef_blocked_dates")
      .select("blocked_date, reason")
      .eq("chef_id", chef.id)
      .order("blocked_date", { ascending: true });

    // Strip inactive menus.
    const activeMenus = ((chef.menus as any[]) || []).filter(
      (m) => m.is_active !== false
    );

    return NextResponse.json({
      success: true,
      chef: {
        ...chef,
        menus: activeMenus,
      },
      reviews: reviews || [],
      availability: availability || null,
      blockedDates: blockedDates || [],
    });
  } catch (err: any) {
    console.error("[chefs/[slug]] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
