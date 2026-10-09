import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTemplateMessage, type TemplateName } from "@/utils/whatsapp";
import {
  TEMPLATES,
} from "@/utils/whatsapp";
import { normalizePhone } from "@/utils/whatsapp";

/**
 * Retry sweep for failed WhatsApp sends.
 *
 * Reads rows from the `whatsapp_retry_queue` view and attempts delivery again.
 * Safe to call from Hostinger cron, GitHub Actions, or the admin console.
 *
 * GET /api/whatsapp/retry          — process up to 25 queued rows
 * GET /api/whatsapp/retry?limit=5  — process fewer
 *
 * Requires a service role key. Rows that succeed twice are not retried
 * again (the dedupe upsert in whatsapp-notify.ts tracks attempt counts).
 */

const MAX_ATTEMPTS = 3;

// Reads the service-role key at request time — never prerender this route.
export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      Math.max(Number(limitParam) || 25, 1),
      100
    );

    const { data: queued, error: queueErr } = await supabase
      .from("whatsapp_retry_queue")
      .select("*")
      .lt("attempts", MAX_ATTEMPTS)
      .limit(limit);

    if (queueErr) {
      return NextResponse.json(
        { error: "Failed to read retry queue.", detail: queueErr.message },
        { status: 500 }
      );
    }

    if (!queued || queued.length === 0) {
      return NextResponse.json({ processed: 0, results: [] });
    }

    const results: Array<{
      id: string;
      template: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const row of queued) {
      const phone = normalizePhone(row.recipient_phone);

      if (!phone) {
        results.push({
          id: row.id,
          template: row.template_name,
          success: false,
          error: "Invalid or missing phone number.",
        });
        await supabase
          .from("whatsapp_message_log")
          .update({
            status: "failed",
            error_detail: "Invalid or missing phone number.",
            attempts: (row.attempts || 0) + 1,
          })
          .eq("id", row.id);
        continue;
      }

      // Replay the exact parameters captured at send time so the retried
      // message is byte-identical to the original intent.
      const parameters = Array.isArray(row.parameters)
        ? row.parameters.map(String)
        : [];

      if (parameters.length === 0) {
        results.push({
          id: row.id,
          template: row.template_name,
          success: false,
          error: "No stored parameters — cannot replay safely.",
        });
        continue;
      }

      const result = await sendTemplateMessage(
        phone,
        row.template_name as TemplateName,
        parameters
      );

      await supabase
        .from("whatsapp_message_log")
        .update({
          status: result.success ? "sent" : "failed",
          error_detail: result.success ? null : result.error,
          sent_at: result.success ? new Date().toISOString() : null,
          attempts: (row.attempts || 0) + 1,
        })
        .eq("id", row.id);

      results.push({
        id: row.id,
        template: row.template_name,
        success: result.success,
        error: result.error,
      });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err: any) {
    console.error("[whatsapp/retry] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Retry sweep failed." },
      { status: 500 }
    );
  }
}