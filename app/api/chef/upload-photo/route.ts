import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/**
 * POST /api/chef/upload-photo
 *
 * Uploads a chef's photo to the public `chef-photos` bucket on their behalf.
 *
 * Two reasons this goes through the server:
 *   1. The bucket's RLS policy only allows admins to write, so a direct
 *      client-side upload from the chef dashboard would be rejected.
 *   2. The Supabase JS client cannot parse the new `sb_secret_...` API keys
 *      used on this project, so we call the Storage REST API directly with the
 *      service key instead of `supabase.storage`.
 *
 * FormData fields: `file` (the image) and `label` (avatar | cover | gallery).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // The caller must be a chef: either the profile role says so, or they own a
    // listing. A client account must never be able to write into chef-photos.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    let chefId = null;
    if (profile?.role === "chef") {
      const { data: chefRecord } = await supabase
        .from("chefs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      chefId = chefRecord?.id || null;
    }
    if (!chefId) {
      return NextResponse.json({ error: "Chef access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const label = String(formData.get("label") || "gallery");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, GIF or AVIF images are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large — please keep it under 8 MB." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Photo uploads are not configured on this site yet." },
        { status: 500 }
      );
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `chefs/${chefId}-${label}-${Date.now()}.${ext || "jpg"}`;

    const buffer = await file.arrayBuffer();
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/chef-photos/${path}`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => "");
      console.error(
        `[chef/upload-photo] Storage error ${uploadRes.status}:`,
        detail.slice(0, 300)
      );
      return NextResponse.json(
        { error: "Could not upload that image. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: `${supabaseUrl}/storage/v1/object/public/chef-photos/${path}`,
      path,
    });
  } catch (err: any) {
    console.error("[chef/upload-photo] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

