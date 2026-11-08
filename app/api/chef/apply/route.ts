import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runWithSchemaFallback } from "@/utils/schemaFallback";
import { packApplicationMeta } from "@/utils/chefApplication";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

/**
 * POST /api/chef/apply
 *
 * The single entry point for chef onboarding. It creates the auth account, the
 * `profiles` row with role `chef`, and the application in one call, then the
 * client signs in and lands on the chef dashboard.
 *
 * Before this route existed, `/apply` inserted straight into
 * `chef_applications` from the browser. Two things went wrong:
 *   1. the live table is missing several columns the form sent, so PostgREST
 *      rejected the whole insert — and the page caught the error and showed
 *      "Application received!" anyway;
 *   2. no account was ever created, so even a saved applicant had no way to log
 *      in and was stranded on a marketing thank-you screen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const password = typeof body.password === "string" ? body.password : "";

    const brandName = clean(body.brandName, 120) || null;
    const city = clean(body.city, 80) || "Nairobi";
    const neighborhood = clean(body.neighborhood, 80) || "Kilimani";
    const cuisines = stringArray(body.cuisines);
    const dietary = stringArray(body.dietary);
    const serviceFormats = stringArray(body.serviceFormats);
    const startingPrice = Number(body.startingPrice) || 4500;
    const experienceYears = clean(body.experienceYears, 60) || "5+ years";
    const specialtyDish = clean(body.specialtyDish, 200) || null;
    const bio = clean(body.bio, 4000);
    const nationalIdNumber = clean(body.nationalIdNumber, 60);
    const vetting = body.vetting && typeof body.vetting === "object" ? body.vetting : {};

    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Full name, email, and phone number are required." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (cuisines.length === 0) {
      return NextResponse.json({ error: "Select at least one cuisine." }, { status: 400 });
    }
    if (!bio || bio.length < 50) {
      return NextResponse.json(
        { error: "Add a bio of at least 50 characters so clients know your background." },
        { status: 400 }
      );
    }
    if (!nationalIdNumber || nationalIdNumber.length < 6) {
      return NextResponse.json(
        { error: "A national ID or passport number is required for verification." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    if (sessionUser && sessionUser.email?.toLowerCase() !== email) {
      return NextResponse.json(
        {
          error:
            "You are signed in with a different email. Sign out first, or apply using the email on this account.",
        },
        { status: 409 }
      );
    }

    let userId: string | null = sessionUser?.id || null;
    let requiresConfirmation = false;

    if (!userId) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "Choose a password of at least 8 characters so you can sign in afterwards." },
          { status: 400 }
        );
      }

      if (admin) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, phone, role: "chef" },
        });

        if (createError || !created.user) {
          const alreadyExists = /already|registered|exists/i.test(
            createError?.message || ""
          );

          if (alreadyExists) {
            // Do NOT reset the password of an existing account from a public
            // form — that would be account takeover. Ask them to sign in and
            // apply from inside their account instead.
            return NextResponse.json(
              {
                error:
                  "An account with this email already exists. Sign in, then finish your chef application from the dashboard.",
                code: "ACCOUNT_EXISTS",
              },
              { status: 409 }
            );
          }

          return NextResponse.json(
            { error: createError?.message || "Could not create your account." },
            { status: 500 }
          );
        }

        userId = created.user.id;
      } else {
        // Service role is not configured (for example on the current Hostinger
        // environment). Fall back to the anon sign-up path; the applicant may
        // need to confirm their email before the dashboard accepts them.
        const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role: "chef" },
          },
        });

        if (signUpError || !signedUp.user) {
          return NextResponse.json(
            {
              error:
                signUpError?.message ||
                "Could not create your account. Try signing in instead.",
            },
            { status: 500 }
          );
        }

        userId = signedUp.user.id;
        requiresConfirmation = !signedUp.session;
      }
    }

    // Ensure the account is a chef account. The auth trigger creates a profile
    // using user_metadata.role, but an existing client account that is now
    // applying would still be role 'client'.
    const profileWriter = admin || supabase;
    await profileWriter.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: "chef",
      },
      { onConflict: "id" }
    );

    // Duplicate guard: one live application per email.
    const { data: existing } = await profileWriter
      .from("chef_applications")
      .select("id, status, email, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && ["pending", "under_review", "approved"].includes(existing.status)) {
      return NextResponse.json(
        {
          error:
            existing.status === "approved"
              ? "This email is already approved as a Book A Chef partner. Sign in to open your dashboard."
              : "We already have your application on file. Sign in to finish your profile.",
          code: "APPLICATION_EXISTS",
          application_id: existing.id,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    const meta = packApplicationMeta({
      v: 1,
      national_id_number: nationalIdNumber,
      service_formats: serviceFormats.length ? serviceFormats : ["in_home", "delivery"],
      service_areas: [neighborhood, "Westlands", "Kilimani", "Karen", "Runda"].filter(
        Boolean
      ),
      vetting: {
        good_conduct: Boolean(vetting.goodConduct),
        good_conduct_cert: clean(vetting.goodConductCert, 120),
        food_safety: Boolean(vetting.foodSafety),
        food_safety_cert: clean(vetting.foodSafetyCert, 120),
        haccp: Boolean(vetting.haccp),
        kitchen_tasting: Boolean(vetting.kitchenTasting),
      },
    });

    const payload: Record<string, any> = {
      full_name: fullName,
      email,
      phone,
      phone_number: phone,
      brand_name: brandName,
      experience_years: experienceYears,
      city,
      neighborhood,
      cuisines,
      dietary,
      dietary_specialties: dietary,
      starting_price: startingPrice,
      specialty_dish: specialtyDish,
      bio,
      portfolio_links: meta,
      status: "pending",
      travel_radius: 50,
      // Added by the onboarding migration. Stripped automatically on the
      // current live schema, where portfolio_links carries the same values.
      user_id: userId,
      national_id_number: nationalIdNumber,
      service_formats: serviceFormats,
      partner_type: "chef",
    };

    const { data: application, error: insertError, dropped } = await runWithSchemaFallback(
      payload,
      (cleanPayload) =>
        profileWriter
          .from("chef_applications")
          .insert([cleanPayload])
          .select("id, status")
          .single()
    );

    if (insertError || !application) {
      console.error("[chef/apply] Application insert failed:", insertError);
      return NextResponse.json(
        {
          error:
            "We could not save your application. Please try again, or WhatsApp our team and we will finish it with you.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      application_id: application.id,
      status: application.status,
      email,
      requires_confirmation: requiresConfirmation,
      dropped_fields: dropped,
      message: requiresConfirmation
        ? "Application saved. Confirm your email, then sign in to continue."
        : "Application saved. Signing you in…",
    });
  } catch (error: any) {
    console.error("[chef/apply] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong while creating your application." },
      { status: 500 }
    );
  }
}
