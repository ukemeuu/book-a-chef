import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BookingClient from "./BookingClient";

export const dynamic = "force-dynamic";

/**
 * Direct booking page for a specific chef.
 *
 * The customer picks a menu, date, time, and party size, then submits the
 * booking. The chef receives an offer they can accept or decline.
 */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const { data: chef } = await supabase
    .from("chefs")
    .select("name, city")
    .eq("slug", params.slug)
    .eq("verified", true)
    .maybeSingle();

  if (!chef) {
    return { title: "Chef not found | Book A Chef Kenya" };
  }

  return {
    title: `Book ${chef.name} | Book A Chef Kenya`,
    description: `Book ${chef.name}, a verified private chef in ${chef.city}. Choose a menu, pick a date, and pay securely via M-Pesa.`,
  };
}

export default async function BookChefPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: chef, error } = await supabase
    .from("chefs")
    .select("*, menus(*)")
    .eq("slug", params.slug)
    .eq("verified", true)
    .maybeSingle();

  if (error || !chef) {
    notFound();
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

  const busySet = Array.from(
    new Set(((busyDates as any[]) || []).map((b) => b.booking_date))
  );

  return (
    <BookingClient
      chef={{
        ...chef,
        menus: ((chef.menus as any[]) || []).filter(
          (m: any) => m.is_active !== false
        ),
      }}
      availability={availability || null}
      blockedDates={blockedDates || []}
      busyDates={busySet}
    />
  );
}
