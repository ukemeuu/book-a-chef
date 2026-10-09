/**
 * WhatsApp Business Cloud API integration (Meta).
 *
 * Status: ARCHITECTURE READY — awaiting Meta Business credentials and
 * approved message templates.
 *
 * When credentials are added to .env.local, this sends real template messages.
 * Without credentials, sendTemplateMessage() returns a structured
 * NOT_CONFIGURED result so booking flows never break.
 *
 * Required setup:
 *  1. Meta Business account with a WhatsApp Business Account (WABA)
 *  2. A sender phone number verified in the WhatsApp Manager
 *  3. Message templates submitted and APPROVED (see TEMPLATES below)
 *  4. A permanent System User access token with `whatsapp_business_messaging`
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when the failure is a config problem, not a delivery problem. */
  notConfigured?: boolean;
}

/**
 * Approved template names. These must match the names of templates
 * approved in the Meta WhatsApp Manager, and their {{placeholders}}
 * must appear in the same order as the `parameters` array passed in.
 */
export const TEMPLATES = {
  /** Customer: we received your request and are matching a chef. */
  REQUEST_RECEIVED: "bookachef_request_received",
  /** Customer: a chef has been matched and assigned. */
  CHEF_ASSIGNED: "bookachef_chef_assigned",
  /** Customer: the chef accepted — here is how to connect. */
  CHEF_ACCEPTED: "bookachef_chef_accepted",
  /** Customer: payment received, booking confirmed. */
  PAYMENT_RECEIVED: "bookachef_payment_received",
  /** Chef: a new dispatch request is available. */
  NEW_REQUEST: "bookachef_new_request",
} as const;

export type TemplateName = (typeof TEMPLATES)[keyof typeof TEMPLATES];

function isConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
  );
}

/**
 * Normalise a Kenyan phone number to the E.164 format Meta expects
 * (254XXXXXXXXX).
 *
 * Accepts: 0712345678, +254712345678, 254712345678, 712345678
 * Returns null when the input cannot be interpreted as a Kenyan number.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip everything that is not a digit or a leading plus.
  let digits = input.replace(/[^\d+]/g, "");

  // Drop a leading plus — we rebuild the prefix ourselves.
  if (digits.startsWith("+")) digits = digits.slice(1);

  // Remove a leading 0 (local trunk prefix) -> becomes 254...
  if (digits.startsWith("0")) {
    digits = `254${digits.slice(1)}`;
  }

  // Already had the country code.
  if (!digits.startsWith("254")) {
    // A bare 9-digit subscriber number is ambiguous; assume Kenyan mobile.
    if (digits.length === 9) {
      digits = `254${digits}`;
    } else {
      return null;
    }
  }

  // Kenyan mobile numbers are 12 digits total: 254 + 9.
  if (digits.length !== 12) return null;

  // Kenyan mobile prefixes are 7 (Safaricom) or 1 (Airtel).
  if (!/^254[71]\d{8}$/.test(digits)) return null;

  return digits;
}

/**
 * Send a pre-approved template message.
 *
 * Never throws — callers treat notification failures as non-fatal and the
 * booking flow continues regardless.
 *
 * @param to - Recipient phone in any common Kenyan format
 * @param templateName - One of TEMPLATES
 * @param parameters - Ordered placeholder values matching the template body
 */
export async function sendTemplateMessage(
  to: string | null | undefined,
  templateName: TemplateName,
  parameters: string[]
): Promise<WhatsAppResult> {
  if (!isConfigured()) {
    return {
      success: false,
      error: "WhatsApp Business API is not configured.",
      notConfigured: true,
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const toNumber = normalizePhone(to);
  if (!toNumber) {
    return { success: false, error: `Invalid Kenyan phone number: ${to ?? "(empty)"}` };
  }

  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
          components: [
            {
              type: "body",
              parameters: parameters.map((text) => ({
                type: "text",
                text: String(text ?? "").slice(0, 1024),
              })),
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiMessage =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${response.status}`;
      console.error(
        `[whatsapp] Template send failed (${templateName} -> ${toNumber}):`,
        apiMessage
      );
      return { success: false, error: apiMessage };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[whatsapp] Sent ${templateName} -> ${toNumber} (${messageId ?? "no id"})`);
    return { success: true, messageId };
  } catch (err: any) {
    console.error(`[whatsapp] Network error sending ${templateName}:`, err?.message || err);
    return { success: false, error: "Network error communicating with WhatsApp." };
  }
}

/**
 * Send a free-form message inside the 24-hour customer service window.
 *
 * Only valid once the recipient has replied to one of your messages.
 * Falls back to returning NOT_ALLOWED so callers can skip it silently.
 */
export async function sendFreeformMessage(
  to: string | null | undefined,
  text: string
): Promise<WhatsAppResult> {
  if (!isConfigured()) {
    return {
      success: false,
      error: "WhatsApp Business API is not configured.",
      notConfigured: true,
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const toNumber = normalizePhone(to);
  if (!toNumber) {
    return { success: false, error: `Invalid Kenyan phone number: ${to ?? "(empty)"}` };
  }

  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: text.slice(0, 4096) },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiMessage =
        data?.error?.message ||
        data?.error?.error_user_msg ||
        `HTTP ${response.status}`;
      // 131047 = re-engagement window closed. Expected, not an error worth surfacing.
      const outsideWindow = String(apiMessage).includes("131047");
      console.error(
        `[whatsapp] Freeform send failed (${toNumber}):`,
        apiMessage,
        outsideWindow ? "(outside 24h window — template required)" : ""
      );
      return { success: false, error: apiMessage, notConfigured: outsideWindow };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    console.error("[whatsapp] Network error sending message:", err?.message || err);
    return { success: false, error: "Network error communicating with WhatsApp." };
  }
}