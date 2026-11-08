import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runWithSchemaFallback } from "@/utils/schemaFallback";
import {
  applicationCompleteness,
  packApplicationMeta,
  unpackApplicationMeta,
} from "@/utils/chefApplication";

export const dynamic = "force-dynamic";

async function resolveApplication(supabase: any, admin: any, email: string) {
  const client = admin || supabase;
  const { data, error } = await client
    .from("chef_applications")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { application: null, error };
  return { application: data, error: null };
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { application, error } = await resolveApplication(
      supabase,
      createAdminClient(),
      user.email
    );

    if (error) {
      return NextResponse.json({ error: "Could not load your application." }, { status: 500 });
    }
    if (!application) {
      return NextResponse.json({ success: true, application: null }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      application,
      meta: unpackApplicationMeta(application.portfolio_links),
      completeness: applicationCompleteness(application),
    });
  } catch (error: any) {
    console.error("[chef/application] GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const writer = admin || supabase;
    const { application, error: readError } = await resolveApplication(
      supabase,
      admin,
      user.email
    );

    if (readError) {
      return NextResponse.json({ error: "Could not load your application." }, { status: 500 });
    }
    if (!application) {
      return NextResponse.json(
        { error: "No chef application is linked to this account." },
        { status: 404 }
      );
    }
    if (application.status === "approved") {
      return NextResponse.json(
        { error: "Your application is already approved. Update your chef profile instead." },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload: Record<string, any> = {};

    const setText = (key: string, value: unknown, max = 120) => {
      if (typeof value === "string") payload[key] = value.trim().slice(0, max);
    };
    const setArray = (key: string, value: unknown) => {
      if (Array.isArray(value)) {
        payload[key] =
          key === "dietary" || key === "dietary_specialties"
            ? value.filter((v) => typeof v === "string")
            : value.filter((v) => typeof v === "string" && v.trim());
      }
    };

    setText("full_name", body.fullName, 120);
    setText("brand_name", body.brandName, 120);
    setText("experience_years", body.experienceYears, 60);
    setText("city", body.city, 80);
    setText("neighborhood", body.neighborhood, 80);
    setText("specialty_dish", body.specialtyDish, 200);
    setText("bio", body.bio, 4000);

    if (typeof body.phone === "string") {
      payload.phone = body.phone.trim().slice(0, 40);
      payload.phone_number = payload.phone;
    }
    if (body.startingPrice != null && Number(body.startingPrice) > 0) {
      payload.starting_price = Number(body.startingPrice);
    }
    setArray("cuisines", body.cuisines);
    if (Array.isArray(body.dietary)) {
      payload.dietary = body.dietary.filter((v: unknown) => typeof v === "string");
      payload.dietary_specialties = payload.dietary;
    }

    // Merge onboarding metadata instead of overwriting it: the applicant may
    // save the culinary profile first and the verification details later.
    const currentMeta = unpackApplicationMeta(application.portfolio_links);
    const nextMeta = {
      ...currentMeta,
      ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
      v: 1 as const,
    };
    if (body.meta) payload.portfolio_links = packApplicationMeta(nextMeta);

    if (body.resubmit === true && application.status === "rejected") {
      payload.status = "pending";
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { data: updated, error: updateError, dropped } = await runWithSchemaFallback(
      payload,
      (cleanPayload) =>
        writer
          .from("chef_applications")
          .update(cleanPayload)
          .eq("id", application.id)
          .select("*")
          .single()
    );

    if (updateError || !updated) {
      console.error("[chef/application] Update failed:", updateError);
      return NextResponse.json(
        { error: "Could not save your profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application: updated,
      meta: unpackApplicationMeta(updated.portfolio_links),
      completeness: applicationCompleteness(updated),
      dropped_fields: dropped,
      message: "Profile saved.",
    });
  } catch (error: any) {
    console.error("[chef/application] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
