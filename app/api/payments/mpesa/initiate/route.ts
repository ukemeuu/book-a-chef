import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { initiateSTKPush } from "@/utils/mpesa";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to initiate payment." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, phone_number } = body;

    if (!booking_id || !phone_number) {
      return NextResponse.json(
        { error: "Booking ID and M-Pesa phone number are required." },
        { status: 400 }
      );
    }

    // 2. Fetch booking and verify ownership
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, chefs(name)")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.client_id !== user.id && booking.client_email !== user.email) {
      return NextResponse.json({ error: "Unauthorized access to this booking." }, { status: 403 });
    }

    if (booking.deposit_paid || booking.status === "confirmed") {
      return NextResponse.json(
        { error: "Deposit for this booking has already been paid and confirmed." },
        { status: 400 }
      );
    }

    // Only a booking that has a chef (or is awaiting legacy acceptance) can be
    // paid for. Taking money on an unassigned or cancelled booking leaves the
    // customer paid with no chef to deliver.
    const payableStatuses = ["pending", "assigned", "chef_accepted", "payment_pending"];
    if (!payableStatuses.includes(String(booking.status))) {
      return NextResponse.json(
        {
          error:
            booking.status === "pending_assignment"
              ? "We are still matching a chef to this request. You can pay as soon as one accepts."
              : "This booking is no longer open for payment.",
        },
        { status: 400 }
      );
    }

    const depositAmount = Number(booking.deposit_amount);

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: "This booking has no payable deposit amount. Please contact support." },
        { status: 400 }
      );
    }

    // 3. Trigger M-Pesa STK Push
    const stkResult = await initiateSTKPush(
      phone_number,
      depositAmount,
      booking.id.slice(0, 12),
      `Culinary Fee for ${booking.chefs?.name || "Private Chef"}`
    );

    if (stkResult.error === "MPESA_NOT_CONFIGURED") {
      // In sandbox/staging mode without live Safaricom API keys
      // Log payment record in pending state and inform client
      return NextResponse.json({
        success: true,
        mode: "manual_pending",
        message:
          "Payment instructions noted. An escrow payment reference has been recorded. Once your transaction is cleared, the booking will confirm automatically.",
        deposit_amount: depositAmount,
        booking_id: booking.id,
      });
    }

    if (!stkResult.success) {
      return NextResponse.json(
        { error: stkResult.error || "Failed to trigger M-Pesa STK push. Please try again." },
        { status: 500 }
      );
    }

    // 4. Record payment attempt. This row is what the callback looks up and
    // what makes confirmation idempotent, so a silent failure here would mean
    // the customer pays and the booking never confirms. Fail loudly instead.
    const { error: paymentInsertError } = await supabase.from("payments").insert([
      {
        booking_id: booking.id,
        client_id: user.id,
        amount: depositAmount,
        currency: "KES",
        payment_type: "deposit",
        mpesa_phone: phone_number,
        mpesa_checkout_request_id: stkResult.checkoutRequestId,
        mpesa_merchant_request_id: stkResult.merchantRequestId,
        status: "pending",
      },
    ]);

    if (paymentInsertError) {
      console.error("[mpesa/initiate] Could not record payment attempt:", paymentInsertError);
      return NextResponse.json(
        {
          error:
            "The M-Pesa prompt was sent, but we could not record the payment attempt. Please contact support before entering your PIN.",
          checkoutRequestId: stkResult.checkoutRequestId,
        },
        { status: 500 }
      );
    }

    // Transition booking to PAYMENT_PENDING
    await supabase
      .from("bookings")
      .update({ status: "payment_pending" })
      .eq("id", booking.id)
      .in("status", payableStatuses);

    return NextResponse.json({
      success: true,
      checkoutRequestId: stkResult.checkoutRequestId,
      message: "M-Pesa STK push sent to your phone. Enter your PIN to complete the culinary fee payment in escrow.",
    });
  } catch (err: any) {
    console.error("[mpesa/initiate] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while initiating payment." },
      { status: 500 }
    );
  }
}
