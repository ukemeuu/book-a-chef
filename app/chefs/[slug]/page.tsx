import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ChefProfileClient from "./ChefProfileClient";

export const dynamic = "force-dynamic";

/**
 * Public chef profile page.
 *
 * Server-rendered so it is indexable and shareable. Only verified chefs are
 * returned — an unverified listing must never be publicly addressable.
 */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const { data: chef } = await supabase
    .from("chefs")
    .select("name, tagline, city, cuisines, avatar_url")
    .eq("slug", params.slug)
    .eq("verified", true)
    .maybeSingle();

  if (!chef) {
    return { title: "Chef not found | Book A Chef Kenya" };
  }

  return {
    title: `${chef.name} | Book A Chef Kenya`,
    description:
      chef.tagline ||
      `${chef.name}, a verified private chef in ${chef.city}. ${
        chef.cuisines?.slice(0, 3).join(", ") || "Private dining"
      }.`,
    openGraph: {
      title: `${chef.name} | Book A Chef Kenya`,
      description:
        chef.tagline ||
        `Verified private chef in ${chef.city}. Contact directly on Book A Chef.`,
      images: chef.avatar_url ? [chef.avatar_url] : undefined,
      type: "profile",
    },
  };
}

export default async function ChefProfilePage({
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("chef_id", chef.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ChefProfileClient
      chef={{
        ...chef,
        menus: ((chef.menus as any[]) || []).filter(
          (m: any) => m.is_active !== false
        ),
      }}
      reviews={reviews || []}
    />
  );
}
