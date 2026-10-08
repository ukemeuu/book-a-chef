/**
 * Notification service — sends emails via Resend + logs to DB.
 * If Resend is not configured, falls back to DB-only logging.
 * Critical operations (booking, payment) must not fail due to notification errors.
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@bookachef.co.ke";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bookachef.co.ke";

export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  html: string;
}

/**
 * Send an email notification. Fails silently — never blocks the caller.
 */
export async function sendEmail(payload: NotificationPayload): Promise<boolean> {
  if (!resend) {
    console.log("[notifications] Resend not configured — email skipped:", payload.subject);
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: `Book A Chef <${FROM_EMAIL}>`,
      to: payload.recipientEmail,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      console.error("[notifications] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notifications] Failed to send email:", err);
    return false;
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

export function bookingRequestedEmail(params: {
  clientName: string;
  chefName: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  totalPrice: number;
  depositAmount: number;
  bookingId: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Request Received</title></head>
<body style="font-family: Georgia, serif; background: #f7f5f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e8e4dc;">
    <div style="background: #1a2e1a; padding: 32px; text-align: center;">
      <h1 style="color: #f7f5f0; font-family: Georgia, serif; margin: 0; font-size: 22px;">Book A Chef</h1>
      <p style="color: #c9a14c; margin: 8px 0 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Kenya's Private Chef Marketplace</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a2e1a; font-size: 20px; margin-top: 0;">Booking Request Received</h2>
      <p style="color: #4a5a4a; line-height: 1.6;">Hi ${params.clientName},</p>
      <p style="color: #4a5a4a; line-height: 1.6;">Your booking request with <strong>${params.chefName}</strong> has been sent. The chef will review and respond within 24 hours.</p>

      <div style="background: #f7f5f0; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e8e4dc;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="color: #6a7a6a; padding: 6px 0;">Date</td><td style="color: #1a2e1a; font-weight: bold; text-align: right;">${params.bookingDate}</td></tr>
          <tr><td style="color: #6a7a6a; padding: 6px 0;">Time</td><td style="color: #1a2e1a; font-weight: bold; text-align: right;">${params.bookingTime}</td></tr>
          <tr><td style="color: #6a7a6a; padding: 6px 0;">Guests</td><td style="color: #1a2e1a; font-weight: bold; text-align: right;">${params.guests}</td></tr>
          <tr style="border-top: 1px solid #e8e4dc;"><td style="color: #6a7a6a; padding: 10px 0 6px;">Total</td><td style="color: #1a2e1a; font-weight: bold; text-align: right; font-size: 16px;">KES ${params.totalPrice.toLocaleString()}</td></tr>
          <tr><td style="color: #6a7a6a; padding: 6px 0;">Culinary Fee (100% Escrow)</td><td style="color: #c9a14c; font-weight: bold; text-align: right;">KES ${params.depositAmount.toLocaleString()}</td></tr>
        </table>
      </div>

      <p style="color: #4a5a4a; line-height: 1.6; font-size: 13px;">Once ${params.chefName} accepts, you will pay the culinary fee in full via protected M-Pesa escrow to connect directly with your chef. On event day, your chef sources ingredients from Carrefour or your chosen supermarket and shares the store Till number for direct payment at cost.</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${SITE_URL}/dashboard" style="background: #1a2e1a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 1px;">View My Bookings</a>
      </div>
    </div>
    <div style="background: #f7f5f0; padding: 20px; text-align: center; font-size: 12px; color: #8a9a8a;">
      <p>Book A Chef Kenya &mdash; <a href="https://bookachef.co.ke" style="color: #1a2e1a;">bookachef.co.ke</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function bookingAcceptedEmail(params: {
  clientName: string;
  chefName: string;
  bookingDate: string;
  depositAmount: number;
  bookingId: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Accepted</title></head>
<body style="font-family: Georgia, serif; background: #f7f5f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e8e4dc;">
    <div style="background: #1a2e1a; padding: 32px; text-align: center;">
      <h1 style="color: #f7f5f0; font-family: Georgia, serif; margin: 0; font-size: 22px;">Book A Chef</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a2e1a; font-size: 20px; margin-top: 0;">✓ ${params.chefName} Accepted Your Booking</h2>
      <p style="color: #4a5a4a; line-height: 1.6;">Hi ${params.clientName},</p>
      <p style="color: #4a5a4a; line-height: 1.6;">Great news! <strong>${params.chefName}</strong> has accepted your booking for <strong>${params.bookingDate}</strong>.</p>
      <p style="color: #4a5a4a; line-height: 1.6;">To confirm your booking and connect directly with your chef, please pay the full culinary fee of <strong>KES ${params.depositAmount.toLocaleString()}</strong> via M-Pesa escrow. On event day, your chef will source ingredients from Carrefour (or your chosen supermarket) and share the store Till number for direct payment at cost.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${SITE_URL}/dashboard" style="background: #1a2e1a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">Pay in Full & Confirm</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function bookingConfirmedEmail(params: {
  clientName: string;
  chefName: string;
  bookingDate: string;
  bookingTime: string;
  address: string;
  guests: number;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Confirmed</title></head>
<body style="font-family: Georgia, serif; background: #f7f5f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e8e4dc;">
    <div style="background: #1a2e1a; padding: 32px; text-align: center;">
      <h1 style="color: #f7f5f0; font-family: Georgia, serif; margin: 0; font-size: 22px;">Book A Chef</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #1a2e1a; font-size: 20px; margin-top: 0;">Booking Confirmed ✓</h2>
      <p style="color: #4a5a4a; line-height: 1.6;">Hi ${params.clientName}, your dinner with <strong>${params.chefName}</strong> is confirmed.</p>
      <div style="background: #f7f5f0; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e8e4dc; font-size: 14px;">
        <p style="margin: 4px 0; color: #4a5a4a;"><strong>Date:</strong> ${params.bookingDate}</p>
        <p style="margin: 4px 0; color: #4a5a4a;"><strong>Time:</strong> ${params.bookingTime}</p>
        <p style="margin: 4px 0; color: #4a5a4a;"><strong>Location:</strong> ${params.address}</p>
        <p style="margin: 4px 0; color: #4a5a4a;"><strong>Guests:</strong> ${params.guests}</p>
      </div>
      <p style="color: #4a5a4a; font-size: 13px;">Your chef will arrive 45–60 minutes before the stated time to set up. They'll bring all ingredients and will leave the kitchen clean.</p>
    </div>
  </div>
</body>
</html>`;
}
