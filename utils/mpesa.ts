/**
 * M-Pesa Daraja API integration
 * Status: ARCHITECTURE READY — awaiting Safaricom credentials
 *
 * When credentials are added to .env.local, this will perform real STK Push.
 * Without credentials, initiateSTKPush() returns a structured error so the
 * booking flow can degrade gracefully.
 *
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

const MPESA_ENV = process.env.MPESA_ENVIRONMENT || "sandbox";
const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export interface STKPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

export interface STKCallbackResult {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
  amount?: number;
  resultCode: number;
  resultDesc: string;
}

/**
 * Get OAuth access token from Safaricom
 */
async function getAccessToken(): Promise<string | null> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return null;
  }

  try {
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Generate the Base64-encoded password for STK Push
 * Password = Base64(ShortCode + Passkey + Timestamp)
 */
function generatePassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE || "";
  const passkey = process.env.MPESA_PASSKEY || "";
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Format timestamp for Daraja: YYYYMMDDHHmmss
 */
function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
}

/**
 * Initiate M-Pesa STK Push (Lipa Na M-Pesa Online)
 *
 * @param phoneNumber - Customer phone in format 254XXXXXXXXX
 * @param amount - Amount in KES (integer)
 * @param accountReference - Booking ID or reference
 * @param description - Short description shown on phone
 */
export async function initiateSTKPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  description: string = "Book A Chef Deposit"
): Promise<STKPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  // Check if M-Pesa is configured
  if (!shortcode || !callbackUrl || !process.env.MPESA_CONSUMER_KEY) {
    return {
      success: false,
      error: "MPESA_NOT_CONFIGURED",
    };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      success: false,
      error: "Failed to authenticate with Safaricom API.",
    };
  }

  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  // Normalize phone number to 254XXXXXXXXX
  const normalizedPhone = phoneNumber
    .replace(/^0/, "254")
    .replace(/^\+/, "")
    .replace(/\s/g, "");

  try {
    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount), // M-Pesa requires integer
        PartyA: normalizedPhone,
        PartyB: shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference.slice(0, 12), // Max 12 chars
        TransactionDesc: description.slice(0, 13), // Max 13 chars
      }),
    });

    const data = await response.json();

    if (data.ResponseCode === "0") {
      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
      };
    }

    return {
      success: false,
      error: data.errorMessage || data.ResponseDescription || "STK Push failed.",
    };
  } catch (err) {
    console.error("[mpesa] STK Push error:", err);
    return {
      success: false,
      error: "Network error communicating with Safaricom.",
    };
  }
}

/**
 * Parse the Daraja callback body (sent by Safaricom to your callback URL)
 * This is called inside /api/payments/mpesa/callback/route.ts
 */
export function parseSTKCallback(body: any): STKCallbackResult {
  const stkCallback = body?.Body?.stkCallback;

  if (!stkCallback) {
    return {
      success: false,
      checkoutRequestId: "",
      merchantRequestId: "",
      resultCode: -1,
      resultDesc: "Invalid callback format",
    };
  }

  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;
  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const merchantRequestId = stkCallback.MerchantRequestID;

  if (resultCode !== 0) {
    // Payment failed or was cancelled
    return {
      success: false,
      checkoutRequestId,
      merchantRequestId,
      resultCode,
      resultDesc,
    };
  }

  // Payment succeeded — extract metadata items
  const items: any[] = stkCallback.CallbackMetadata?.Item || [];
  const get = (name: string) => items.find((i: any) => i.Name === name)?.Value;

  return {
    success: true,
    checkoutRequestId,
    merchantRequestId,
    mpesaReceiptNumber: get("MpesaReceiptNumber"),
    transactionDate: String(get("TransactionDate") || ""),
    phoneNumber: String(get("PhoneNumber") || ""),
    amount: Number(get("Amount") || 0),
    resultCode,
    resultDesc,
  };
}
