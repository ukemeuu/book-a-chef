import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chefs/[slug]/favorite
 * Returns whether the signed-in user has favourited this chef.
 *
 * POST /api/chefs/[slug]/favorite
 * Toggles the favourite state for the signed-in user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isFavorite: false });
    }

    const { data: chef } = await supabase
      .from("chefs")
      .select("id")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!chef) {
      return NextResponse.json({ isFavorite: false });
    }

    const { data: fav } = await supabase
      .from("chef_favorites")
      .select("id")
      .eq("client_id", user.id)
      .eq("chef_id", chef.id)
      .maybeSingle();

    return NextResponse.json({ isFavorite: !!fav });
  } catch {
    return NextResponse.json({ isFavorite: false });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in to save chefs." },
        { status: 401 }
      );
    }

    const { data: chef } = await supabase
      .from("chefs")
      .select("id")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!chef) {
      return NextResponse.json({ error: "Chef not found." }, { status: 404 });
    }

    // Toggle: delete if exists, insert if not.
    const { data: existing } = await supabase
      .from("chef_favorites")
      .select("id")
      .eq("client_id", user.id)
      .eq("chef_id", chef.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("chef_favorites")
        .delete()
        .eq("client_id", user.id)
        .eq("chef_id", chef.id);
      return NextResponse.json({ isFavorite: false });
    }

    const { error } = await supabase
      .from("chef_favorites")
      .insert([{ client_id: user.id, chef_id: chef.id }]);

    if (error) {
      return NextResponse.json(
        { error: "Could not save this chef." },
        { status: 500 }
      );
    }

    return NextResponse.json({ isFavorite: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
