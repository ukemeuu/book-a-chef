import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { calculateProfileReadiness } from "@/utils/profileReadiness";
import { runWithSchemaFallback } from "@/utils/schemaFallback";
import {
  unpackApplicationMeta,
  type ApplicationMeta,
} from "@/utils/chefApplication";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to update chef profile." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      chef_id,
      name,
      brand_name,
      tagline,
      bio,
      culinary_philosophy,
      city,
      service_areas,
      cuisines,
      dietary_specialties,
      price_per_guest,
      min_guests,
      max_guests,
      avatar_url,
      cover_image_url,
      gallery_images,
      partner_type,
      restaurant_name,
      allow_in_home,
      allow_delivery,
      national_id_number,
      requested_live_status,
    } = body;

    // Reject any attempt to submit or store sensitive tax information
    if ("kra_pin" in body || "kraPin" in body) {
      return NextResponse.json(
        { error: "Invalid profile parameters provided." },
        { status: 400 }
      );
    }

    if (!chef_id) {
      return NextResponse.json({ error: "chef_id is required." }, { status: 400 });
    }

    // Verify chef record belongs to this user or admin
    const { data: chefRecord, error: fetchErr } = await supabase
      .from("chefs")
      .select("*, menus(*)")
      .eq("id", chef_id)
      .maybeSingle();

    if (fetchErr || !chefRecord) {
      return NextResponse.json({ error: "Chef profile not found." }, { status: 404 });
    }

    // Enforce authorization: must match user_id or email, or be an admin
    if (chefRecord.user_id !== user.id && chefRecord.email !== user.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        return NextResponse.json(
          { error: "You are not authorized to edit this chef profile." },
          { status: 403 }
        );
      }
    }

    // Construct format array. Only rebuild it when the client actually sent the
    // toggles — an unrelated profile save must not wipe the formats a chef set
    // earlier.
    const formatsProvided =
      typeof allow_in_home === "boolean" || typeof allow_delivery === "boolean";

    const existingFormats: string[] = Array.isArray(chefRecord.service_formats)
      ? chefRecord.service_formats
      : [];

    const includeInHome =
      typeof allow_in_home === "boolean" ? allow_in_home : existingFormats.includes("in_home");
    const includeDelivery =
      typeof allow_delivery === "boolean" ? allow_delivery : existingFormats.includes("delivery");

    const serviceFormats: ("in_home" | "delivery")[] = [
      ...(includeInHome ? (["in_home"] as const) : []),
      ...(includeDelivery ? (["delivery"] as const) : []),
    ];

    // Pre-migration fallback.
    //
    // The live `chefs` table has no `national_id_number` or `service_formats`.
    // Those values were captured at application time (or packed into
    // `portfolio_links`), so reading only the listing columns would mark a
    // fully-complete chef as incomplete and permanently block the 97% gate.
    let applicationRow: any = null;
    let applicationMeta: ApplicationMeta = { v: 1 };

    if (user.email) {
      const reader = createAdminClient() ?? supabase;
      const { data } = await reader
        .from("chef_applications")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        applicationRow = data;
        applicationMeta = unpackApplicationMeta(data.portfolio_links);
      }
    }

    const nationalId = String(
      national_id_number ??
        chefRecord.national_id_number ??
        applicationRow?.national_id_number ??
        applicationMeta.national_id_number ??
        ""
    ).trim();

    let effectiveFormats: string[];
    if (formatsProvided) {
      effectiveFormats = serviceFormats;
    } else if (existingFormats.length) {
      effectiveFormats = existingFormats;
    } else if (
      Array.isArray(applicationRow?.service_formats) &&
      applicationRow.service_formats.length
    ) {
      effectiveFormats = applicationRow.service_formats;
    } else {
      effectiveFormats = applicationMeta.service_formats || [];
    }

    // Normalise menu rows before scoring readiness. Readiness expects the
    // camelCase `Menu` shape (`pricePerGuest`, parsed `courses`), but the DB
    // returns snake_case (`price_per_guest`) with `courses` as JSON. Passing raw
    // rows made the "complete menu" check fail for every chef, capping
    // completeness at 94% and making the 97% go-live gate impossible to pass.
    const menuRows: any[] = Array.isArray(chefRecord.menus) ? chefRecord.menus : [];
    const normalizedMenus = menuRows.map((row) => {
      let courses = row.courses;
      if (typeof courses === "string") {
        try {
          courses = JSON.parse(courses);
        } catch {
          courses = {};
        }
      }
      return {
        ...row,
        pricePerGuest: Number(row.pricePerGuest ?? row.price_per_guest ?? 0),
        courses: courses || {},
      };
    });

    // Recalculate profile readiness server-side
    const readiness = calculateProfileReadiness({
      name: name ?? chefRecord.name,
      phone: body.phone ?? chefRecord.phone,
      nationalIdNumber: nationalId,
      avatar: avatar_url ?? chefRecord.avatar_url,
      coverImage: cover_image_url ?? chefRecord.cover_image_url,
      gallery: gallery_images ?? chefRecord.gallery_images,
      brand: brand_name ?? chefRecord.brand_name,
      tagline: tagline ?? chefRecord.tagline,
      partnerType: partner_type ?? chefRecord.partner_type,
      serviceFormats: effectiveFormats as ("in_home" | "delivery")[],
      city: city ?? chefRecord.city,
      serviceAreas: service_areas ?? chefRecord.service_areas,
      bio: bio ?? chefRecord.bio,
      cuisines: cuisines ?? chefRecord.cuisines,
      culinaryPhilosophy: culinary_philosophy ?? chefRecord.culinary_philosophy,
      dietary: dietary_specialties ?? chefRecord.dietary_specialties,
      startingPrice: price_per_guest ? Number(price_per_guest) : Number(chefRecord.price_per_guest),
      minGuests: min_guests ? Number(min_guests) : chefRecord.min_guests,
      maxGuests: max_guests ? Number(max_guests) : chefRecord.max_guests,
      menus: normalizedMenus,
    });

    // 97% Gate Check: Cannot go live if under 97%
    let finalIsAvailable = chefRecord.is_available;
    if (requested_live_status === true) {
      if (!readiness.canGoLive) {
        return NextResponse.json(
          {
            error: `Profile is currently ${readiness.percentage}% complete. You must reach at least 97% completion to go live.`,
            readiness,
          },
          { status: 400 }
        );
      }
      finalIsAvailable = true;
    } else if (requested_live_status === false) {
      finalIsAvailable = false;
    }

    // Update DB
    const updatePayload: Record<string, any> = {
      name: name ?? chefRecord.name,
      brand_name: brand_name ?? chefRecord.brand_name,
      tagline: tagline ?? chefRecord.tagline,
      bio: bio ?? chefRecord.bio,
      culinary_philosophy: culinary_philosophy ?? chefRecord.culinary_philosophy,
      city: city ?? chefRecord.city,
      service_areas: service_areas ?? chefRecord.service_areas,
      cuisines: cuisines ?? chefRecord.cuisines,
      dietary_specialties: dietary_specialties ?? chefRecord.dietary_specialties,
      price_per_guest: price_per_guest ? Number(price_per_guest) : chefRecord.price_per_guest,
      min_guests: min_guests ? Number(min_guests) : chefRecord.min_guests,
      max_guests: max_guests ? Number(max_guests) : chefRecord.max_guests,
      avatar_url: avatar_url ?? chefRecord.avatar_url,
      cover_image_url: cover_image_url ?? chefRecord.cover_image_url,
      gallery_images: gallery_images ?? chefRecord.gallery_images,
      partner_type: partner_type ?? chefRecord.partner_type,
      restaurant_name: restaurant_name ?? chefRecord.restaurant_name,
      allow_in_home: includeInHome,
      allow_delivery: includeDelivery,
      national_id_number: national_id_number ?? chefRecord.national_id_number,
      is_available: finalIsAvailable,
      updated_at: new Date().toISOString(),
    };

    if (body.phone) updatePayload.phone = body.phone;
    // Only write the array when the caller sent toggles, so a drifted or
    // missing column cannot strip existing data.
    if (formatsProvided) updatePayload.service_formats = serviceFormats;

    const { data: updated, error: updateErr, dropped } = await runWithSchemaFallback(
      updatePayload,
      (payload) =>
        supabase.from("chefs").update(payload).eq("id", chef_id).select().maybeSingle()
    );

    if (updateErr || !updated) {
      // A real write failure must never be reported as success — the chef would
      // believe their profile was saved and stay stuck at a low completeness
      // score with no idea why.
      console.error("[chef/update-profile] Update failed:", updateErr);
      return NextResponse.json(
        {
          error:
            updateErr?.message ||
            "We could not save your profile. Please try again, and contact support if it persists.",
          readiness,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chef: updated,
      readiness,
      isAvailable: finalIsAvailable,
      // Report which drifted columns were skipped so the UI can warn instead of
      // silently losing input.
      droppedFields: dropped,
      message: finalIsAvailable ? "Chef is live on marketplace!" : "Profile saved.",
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
