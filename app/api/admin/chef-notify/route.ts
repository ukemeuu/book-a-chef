import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail, photoRequestEmail } from "@/utils/notifications";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bookachef.co.ke";

/**
 * POST /api/admin/chef-notify
 *
 * Sends a chef an email asking them to replace the placeholder images on their
 * public profile with their own photos. Email is best-effort: if Resend is not
 * configured the response includes a WhatsApp fallback the admin can send by
 * hand, so the request is never silently lost.
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const chefId = String(body.chef_id || "");
    const kind = String(body.kind || "photo_request");

    if (!chefId) {
      return NextResponse.json({ error: "chef_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const reader = admin || supabase;

    const { data: chef, error } = await reader
      .from("chefs")
      .select("id, name, email, phone, slug, avatar_url, cover_image_url")
      .eq("id", chefId)
      .maybeSingle();

    if (error || !chef) {
      return NextResponse.json({ error: "Chef not found." }, { status: 404 });
    }

    if (kind !== "photo_request") {
      return NextResponse.json({ error: `Unknown notify kind: ${kind}` }, { status: 400 });
    }

    const firstName = String(chef.name || "Chef").split(" ")[0];
    const dashboardUrl = `${SITE_URL}/chef-dashboard`;

    if (!chef.email) {
      return NextResponse.json(
        {
          error:
            "This chef has no email address on file. Add one by editing the chef, or use WhatsApp.",
          whatsapp_url: buildWhatsApp(chef.phone, chef.name, dashboardUrl),
        },
        { status: 400 }
      );
    }

    const sent = await sendEmail({
      recipientEmail: chef.email,
      recipientName: chef.name,
      subject: "Add your photos to your Book A Chef profile",
      html: photoRequestEmail({ chefName: firstName, dashboardUrl }),
    });

    return NextResponse.json({
      success: sent,
      channel: sent ? "email" : "none",
      message: sent
        ? `Photo request emailed to ${chef.name} at ${chef.email}.`
        : "Email could not be sent (Resend is not configured). Use the WhatsApp option instead.",
      whatsapp_url: buildWhatsApp(chef.phone, chef.name, dashboardUrl),
      chef: { id: chef.id, name: chef.name, email: chef.email, phone: chef.phone },
    });
  } catch (err: any) {
    console.error("[admin/chef-notify] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function buildWhatsApp(
  phone: string | null,
  name: string,
  dashboardUrl: string
): string | null {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0/, "254");
  if (!digits) return null;
  const text = `Hi ${name}, your Book A Chef profile is live but still shows our placeholder logo. Please sign in and add your own portrait, cover photo, and dish photos — it takes under two minutes: ${dashboardUrl}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
