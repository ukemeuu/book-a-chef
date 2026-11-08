import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, siteUrl } from "@/utils/supabase/admin";
import { runWithSchemaFallback } from "@/utils/schemaFallback";
import {
  buildChefFromApplication,
  DEFAULT_CHEF_AVATAR,
  DEFAULT_CHEF_COVER,
} from "@/utils/chefApplication";
import { slugify } from "@/utils/marketplace";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, status: 401, error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required." };
  }
  return { ok: true as const, user };
}

async function ensureChefAccount(
  admin: any,
  email: string,
  fullName: string,
  phone?: string | null
): Promise<{ userId: string | null; inviteUrl: string | null; error?: string }> {  if (!email) return { userId: null, inviteUrl: null, error: "No email on file." };

  let userId: string | null = null;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: "chef" },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (!/already|registered|exists/i.test(createError?.message || "")) {
      return {
        userId: null,
        inviteUrl: null,
        error: createError?.message || "Could not create the chef account.",
      };
    }
  }

  if (!userId) {
    // Auth user exists but the profile row is missing. Find it directly.
    try {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = list?.users?.find(
        (u: any) => String(u.email || "").toLowerCase() === email.toLowerCase()
      );
      userId = match?.id || null;
    } catch {
      userId = null;
    }
  }

  if (userId) {
    await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        role: "chef",
      },
      { onConflict: "id" }
    );
  }

  let inviteUrl: string | null = null;
  try {
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl()}/reset-password` },
    });
    inviteUrl = link?.properties?.action_link || null;
  } catch {
    inviteUrl = null;
  }

  return { userId, inviteUrl };
}

/**
 * Seed a chef's first menu when they have none.
 *
 * The go-live readiness checklist requires one complete menu, and the chef
 * portal has no menu editor yet. Without a seeded menu an approved chef could
 * never reach the 97% gate — a silent onboarding dead end.
 */
async function ensureDefaultMenu(
  admin: any,
  chefId: string,
  opts: { signatureDish?: string | null; price?: number | null }
) {
  const { data: existing } = await admin
    .from("menus")
    .select("id")
    .eq("chef_id", chefId)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const dish = String(opts.signatureDish || "").trim() || "Chef's Signature";

  await runWithSchemaFallback(
    {
      chef_id: chefId,
      title: `${dish} Tasting Menu`,
      tag: "Signature",
      description: `A signature menu built around ${dish}.`,
      price_per_guest: Number(opts.price) || 4500,
      courses: {
        appetizer: { name: "Seasonal opening", description: "Chef's selection" },
        main: { name: dish, description: "Signature course" },
        dessert: { name: "Closing course", description: "Chef's selection" },
      },
      is_active: true,
    },
    (cleanPayload) => admin.from("menus").insert([cleanPayload]).select("id").single()
  );
}

/**
 * POST /api/admin/chef-actions
 *
 * One call does the whole admin-side onboarding:
 *   • approve an application and create its marketplace listing
 *   • create the chef's login account and return a one-time invite link
 *   • toggle a listing live/paused
 *
 * Before this existed, "Qualify & List" opened a 20-field form and inserted a
 * `chefs` row with no `user_id` and no `email`. The chef was now "live" but had
 * no account and could not accept the bookings dispatch sent them.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to the server environment to create chef accounts.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "set_available") {
      const chefId = String(body.chef_id || "");
      const next = Boolean(body.is_available);
      if (!chefId) {
        return NextResponse.json({ error: "chef_id is required." }, { status: 400 });
      }
      const { error } = await admin
        .from("chefs")
        .update({ is_available: next, updated_at: new Date().toISOString() })
        .eq("id", chefId);
      if (error) {
        return NextResponse.json({ error: "Could not update the chef." }, { status: 500 });
      }
      return NextResponse.json({ success: true, is_available: next });
    }

    // Update an existing directory listing. Backs the admin edit modal so a
    // chef's public details (including phone and email) can be corrected
    // without touching the database directly.
    if (action === "update_listing") {
      const chefId = String(body.chef_id || "");
      if (!chefId) {
        return NextResponse.json({ error: "chef_id is required." }, { status: 400 });
      }

      const text = (v: unknown, max = 500) =>
        typeof v === "string" ? v.trim().slice(0, max) : undefined;
      const arr = (v: unknown) =>
        Array.isArray(v)
          ? v.filter((x) => typeof x === "string" && x.trim())
          : undefined;

      const payload: Record<string, any> = {};
      const set = (key: string, value: unknown) => {
        if (value !== undefined) payload[key] = value;
      };

      set("name", text(body.name, 120));
      set("brand_name", text(body.brand_name, 120));
      set("tagline", text(body.tagline, 200));
      set("bio", text(body.bio, 4000));
      set("city", text(body.city, 80));
      set("phone", text(body.phone, 40));
      set("email", text(body.email, 200));
      set("avatar_url", text(body.avatar_url, 500));
      set("cover_image_url", text(body.cover_image_url, 500));
      set("gallery_images", arr(body.gallery_images));
      set("service_areas", arr(body.service_areas));
      set("cuisines", arr(body.cuisines));
      set("dietary_specialties", arr(body.dietary_specialties));

      if (body.price_per_guest != null && Number(body.price_per_guest) >= 0) {
        payload.price_per_guest = Number(body.price_per_guest);
      }
      if (body.min_guests != null) payload.min_guests = Number(body.min_guests);
      if (body.max_guests != null) payload.max_guests = Number(body.max_guests);
      if (typeof body.verified === "boolean") payload.verified = body.verified;
      if (typeof body.featured === "boolean") payload.featured = body.featured;
      if (typeof body.is_available === "boolean") payload.is_available = body.is_available;

      payload.updated_at = new Date().toISOString();

      const { data, error } = await admin
        .from("chefs")
        .update(payload)
        .eq("id", chefId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        console.error("[admin/chef-actions] update_listing failed:", error);
        return NextResponse.json({ error: "Could not save the chef." }, { status: 500 });
      }

      return NextResponse.json({ success: true, chef: data });
    }

    // Ad-hoc listing for a chef the team met offline. Creates the login account
    // and the listing together so the chef is never a ghost row.
    if (action === "create_listing") {
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.full_name || "").trim();
      const phone = String(body.phone || "").trim();

      if (!email || !fullName) {
        return NextResponse.json(
          { error: "A full name and email are required to create the account." },
          { status: 400 }
        );
      }

      const account = await ensureChefAccount(admin, email, fullName, phone);
      if (!account.userId) {
        return NextResponse.json(
          {
            error:
              account.error ||
              "Could not create a login for this chef. Check the email and try again.",
          },
          { status: 500 }
        );
      }

      // Generate a unique slug so the listing is addressable at /chefs/[slug].
      const baseSlug = slugify(fullName);
      const { data: slugConflict } = await admin
        .from("chefs")
        .select("slug")
        .eq("slug", baseSlug)
        .maybeSingle();
      const slug = slugConflict
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;

      const payload = {
        name: fullName,
        slug,
        brand_name: String(body.brand_name || `${fullName} Kitchens`).slice(0, 120),
        tagline: String(body.tagline || "Private dining, cooked in your kitchen").slice(0, 200),
        city: String(body.city || "Nairobi").slice(0, 80),
        service_areas: Array.isArray(body.service_areas)
          ? body.service_areas
          : ["Kilimani", "Karen", "Westlands", "Runda"],
        cuisines: Array.isArray(body.cuisines) && body.cuisines.length
          ? body.cuisines
          : ["Continental"],
        dietary_specialties: Array.isArray(body.dietary)
          ? body.dietary
          : ["Halal"],
        price_per_guest: Number(body.price_per_guest) || 4500,
        min_guests: Number(body.min_guests) || 2,
        max_guests: Number(body.max_guests) || 30,
        bio:
          String(body.bio || "").trim() ||
          `Private chef based in ${body.city || "Nairobi"}.`,
        culinary_philosophy:
          "Seasonal ingredients, disciplined technique, and a spotless kitchen at the end of the night.",
        avatar_url: body.avatar_url || DEFAULT_CHEF_AVATAR,
        cover_image_url: body.cover_image_url || DEFAULT_CHEF_COVER,
        gallery_images: Array.isArray(body.gallery_images) ? body.gallery_images : [],
        verified: true,
        verification_status: "approved",
        rating: 5,
        reviews_count: 0,
        featured: false,
        // The chef must sign in and complete their own profile before dispatch
        // may send them work.
        is_available: false,
        user_id: account.userId,
        email,
        phone: phone || null,
        travel_radius_km: 25,
        min_notice_hours: 48,
      };

      const { data: chef, error: chefError } = await runWithSchemaFallback(
        payload,
        (cleanPayload) =>
          admin.from("chefs").insert([cleanPayload]).select("*").single()
      );

      if (chefError || !chef) {
        console.error("[admin/chef-actions] create_listing failed:", chefError);
        return NextResponse.json(
          { error: "The account exists, but the listing could not be created." },
          { status: 500 }
        );
      }

      await ensureDefaultMenu(admin, chef.id, {
        signatureDish: body.specialty_dish,
        price: body.price_per_guest,
      });

      return NextResponse.json({
        success: true,
        chef,
        user_id: account.userId,
        invite_url: account.inviteUrl,
        whatsapp_url: buildInviteWhatsApp(
          phone,
          fullName,
          account.inviteUrl
        ),
        message: "Chef account and listing created.",
      });
    }

    // Attach an existing legacy listing to a real login account. This is how
    // the eight chefs with `user_id IS NULL` become dispatchable.
    if (action === "link_chef") {
      const chefId = String(body.chef_id || "");
      const email = String(body.email || "").trim().toLowerCase();
      const fullName = String(body.full_name || "Chef Partner").trim();
      const phone = String(body.phone || "").trim();

      if (!chefId || !email) {
        return NextResponse.json(
          { error: "chef_id and email are required." },
          { status: 400 }
        );
      }

      const account = await ensureChefAccount(admin, email, fullName, phone);
      if (!account.userId) {
        return NextResponse.json(
          { error: account.error || "Could not create the chef account." },
          { status: 500 }
        );
      }

      const { error: updateError } = await runWithSchemaFallback(
        {
          user_id: account.userId,
          email,
          ...(phone ? { phone } : {}),
        },
        (cleanPayload) =>
          admin.from("chefs").update(cleanPayload).eq("id", chefId).select("id").single()
      );

      if (updateError) {
        return NextResponse.json(
          { error: "Could not link this listing to the account." },
          { status: 500 }
        );
      }

      // Legacy listings may never have had a menu; the chef cannot pass the
      // go-live gate without one.
      await ensureDefaultMenu(admin, chefId, { signatureDish: null, price: null });

      return NextResponse.json({
        success: true,
        user_id: account.userId,
        invite_url: account.inviteUrl,
        whatsapp_url: buildInviteWhatsApp(phone, fullName, account.inviteUrl),
        message: "Listing linked to a login account.",
      });
    }

    // Approve / reject / re-open an application. Uses the service role so the
    // write cannot be silently dropped by RLS.
    if (action === "set_status") {
      const applicationId = String(body.application_id || "");
      const status = String(body.status || "");
      if (!applicationId || !["pending", "under_review", "approved", "rejected"].includes(status)) {
        return NextResponse.json(
          { error: "application_id and a valid status are required." },
          { status: 400 }
        );
      }
      const { error } = await runWithSchemaFallback(
        {
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: auth.user.id,
        },
        (cleanPayload) =>
          admin
            .from("chef_applications")
            .update(cleanPayload)
            .eq("id", applicationId)
            .select("id")
            .single()
      );

      if (error) {
        return NextResponse.json(
          { error: "Could not update the application status." },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, status });
    }

    const applicationId = String(body.application_id || "");
    if (!applicationId) {
      return NextResponse.json({ error: "application_id is required." }, { status: 400 });
    }

    const { data: application, error: appError } = await admin
      .from("chef_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const email = String(application.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "This application has no email, so an account cannot be created." },
        { status: 400 }
      );
    }

    const fullName =
      application.full_name ||
      [application.first_name, application.last_name].filter(Boolean).join(" ") ||
      "Chef Partner";

    const account = await ensureChefAccount(
      admin,
      email,
      fullName,
      application.phone || application.phone_number
    );

    if (action === "invite") {
      return NextResponse.json({
        success: true,
        user_id: account.userId,
        invite_url: account.inviteUrl,
        email,
        whatsapp_url: buildInviteWhatsApp(
          application.phone || application.phone_number,
          fullName,
          account.inviteUrl
        ),
        message: account.userId
          ? "Chef account is ready."
          : "Could not create the chef account.",
      });
    }

    if (action !== "approve") {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Reuse an existing listing for this email instead of creating duplicates.
    let existingChef: any = null;
    if (account.userId) {
      const { data } = await admin
        .from("chefs")
        .select("id, user_id, email")
        .eq("user_id", account.userId)
        .maybeSingle();
      existingChef = data || null;
    }
    if (!existingChef) {
      const { data } = await admin
        .from("chefs")
        .select("id, user_id, email")
        .eq("email", email)
        .maybeSingle();
      existingChef = data || null;
    }

    const chefPayload = {
      ...buildChefFromApplication(application, account.userId),
      ...(body.overrides && typeof body.overrides === "object" ? body.overrides : {}),
      avatar_url: body.avatar_url || DEFAULT_CHEF_AVATAR,
      cover_image_url: body.cover_image_url || DEFAULT_CHEF_COVER,
      approved_at: new Date().toISOString(),
    };

    let chef: any = null;
    let chefError: any = null;

    if (existingChef?.id) {
      const result = await runWithSchemaFallback(chefPayload, (cleanPayload) =>
        admin
          .from("chefs")
          .update(cleanPayload)
          .eq("id", existingChef.id)
          .select("*")
          .single()
      );
      chef = result.data;
      chefError = result.error;
    } else {
      const result = await runWithSchemaFallback(chefPayload, (cleanPayload) =>
        admin.from("chefs").insert([cleanPayload]).select("*").single()
      );
      chef = result.data;
      chefError = result.error;
    }

    if (chefError || !chef) {
      console.error("[admin/chef-actions] Chef write failed:", chefError);
      return NextResponse.json(
        { error: "The account exists, but the marketplace listing could not be saved." },
        { status: 500 }
      );
    }

    // A published chef needs at least one complete menu to pass the go-live
    // checklist. Always seed one — an applicant without a named signature dish
    // would otherwise have no way to reach the 97% gate.
    await ensureDefaultMenu(admin, chef.id, {
      signatureDish: application.specialty_dish,
      price: application.starting_price,
    });

    await runWithSchemaFallback(
      {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      },
      (cleanPayload) =>
        admin
          .from("chef_applications")
          .update(cleanPayload)
          .eq("id", application.id)
          .select("id")
          .single()
    );

    if (account.userId) {
      await admin.from("notifications").insert([
        {
          recipient_id: account.userId,
          type: "chef_approved",
          title: "You're approved to cook with Book A Chef",
          message:
            "Your profile is live. Sign in, finish your profile, and switch yourself online to start receiving jobs.",
          entity_type: "chef",
          entity_id: chef.id,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      chef,
      user_id: account.userId,
      email,
      invite_url: account.inviteUrl,
      whatsapp_url: buildInviteWhatsApp(
        application.phone || application.phone_number,
        fullName,
        account.inviteUrl
      ),
      message: "Application approved and listing created.",
    });
  } catch (error: any) {
    console.error("[admin/chef-actions] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function buildInviteWhatsApp(
  phone: string | null | undefined,
  name: string,
  inviteUrl: string | null
): string | null {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0/, "254");
  if (!digits) return null;

  const text = inviteUrl
    ? `Hi ${name}, you're approved on Book A Chef. Set your password and open your dashboard here: ${inviteUrl}`
    : `Hi ${name}, you're approved on Book A Chef. Reply here and we'll help you open your chef dashboard.`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
