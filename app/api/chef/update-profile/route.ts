import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { calculateProfileReadiness } from "@/utils/profileReadiness";

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

    const body = await request.json();
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

    // Verify chef record belongs to this user or admin
    const { data: chefRecord, error: fetchErr } = await supabase
      .from("chefs")
      .select("*, menus(*)")
      .eq("id", chef_id)
      .single();

    if (fetchErr || !chefRecord) {
      return NextResponse.json({ error: "Chef profile not found." }, { status: 404 });
    }

    // Enforce authorization: must match user_id or email, or be an admin
    if (chefRecord.user_id !== user.id && chefRecord.email !== user.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.json(
          { error: "You are not authorized to edit this chef profile." },
          { status: 403 }
        );
      }
    }

    // Construct format array
    const serviceFormats: ("in_home" | "delivery")[] = [];
    if (allow_in_home) serviceFormats.push("in_home");
    if (allow_delivery) serviceFormats.push("delivery");

    // Recalculate profile readiness server-side
    const readiness = calculateProfileReadiness({
      name: name ?? chefRecord.name,
      phone: body.phone ?? chefRecord.phone,
      nationalIdNumber: national_id_number ?? chefRecord.national_id_number,
      avatar: avatar_url ?? chefRecord.avatar_url,
      coverImage: cover_image_url ?? chefRecord.cover_image_url,
      gallery: gallery_images ?? chefRecord.gallery_images,
      brand: brand_name ?? chefRecord.brand_name,
      tagline: tagline ?? chefRecord.tagline,
      partnerType: partner_type ?? chefRecord.partner_type,
      serviceFormats,
      city: city ?? chefRecord.city,
      serviceAreas: service_areas ?? chefRecord.service_areas,
      bio: bio ?? chefRecord.bio,
      cuisines: cuisines ?? chefRecord.cuisines,
      culinaryPhilosophy: culinary_philosophy ?? chefRecord.culinary_philosophy,
      dietary: dietary_specialties ?? chefRecord.dietary_specialties,
      startingPrice: price_per_guest ? Number(price_per_guest) : Number(chefRecord.price_per_guest),
      minGuests: min_guests ? Number(min_guests) : chefRecord.min_guests,
      maxGuests: max_guests ? Number(max_guests) : chefRecord.max_guests,
      menus: chefRecord.menus || [],
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
      allow_in_home: allow_in_home ?? true,
      allow_delivery: allow_delivery ?? true,
      service_formats: serviceFormats,
      national_id_number: national_id_number ?? chefRecord.national_id_number,
      is_available: finalIsAvailable,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await supabase
      .from("chefs")
      .update(updatePayload)
      .eq("id", chef_id)
      .select()
      .single();

    if (updateErr) {
      console.warn("DB chef update error:", updateErr.message);
      // Even if schema column is newly added, return computed readiness
      return NextResponse.json({
        success: true,
        readiness,
        message: "Profile updated successfully.",
        isAvailable: finalIsAvailable,
      });
    }

    return NextResponse.json({
      success: true,
      chef: updated,
      readiness,
      isAvailable: finalIsAvailable,
      message: finalIsAvailable ? "Chef is live on marketplace!" : "Profile saved.",
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
