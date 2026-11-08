import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chefs/[slug]/availability
 *
 * Returns the chef's weekly availability and blocked dates, plus the dates of
 * their confirmed bookings so the booking UI can disable those days too.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();

    const { data: chef } = await supabase
      .from("chefs")
      .select("id")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!chef) {
      return NextResponse.json({ error: "Chef not found." }, { status: 404 });
    }

    const { data: availability } = await supabase
      .from("chef_availability")
      .select("*")
      .eq("chef_id", chef.id)
      .maybeSingle();

    const { data: blockedDates } = await supabase
      .from("chef_blocked_dates")
      .select("blocked_date, reason")
      .eq("chef_id", chef.id)
      .order("blocked_date", { ascending: true });

    // Dates the chef already has active bookings — also unavailable.
    const { data: busyDates } = await supabase
      .from("bookings")
      .select("booking_date")
      .eq("chef_id", chef.id)
      .in("status", [
        "assigned",
        "chef_accepted",
        "payment_pending",
        "confirmed",
        "en_route",
        "cooking",
        "in_progress",
      ]);

    const busySet = new Set(
      ((busyDates as any[]) || []).map((b) => b.booking_date)
    );

    return NextResponse.json({
      success: true,
      availability: availability || null,
      blockedDates: blockedDates || [],
      busyDates: Array.from(busySet),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
