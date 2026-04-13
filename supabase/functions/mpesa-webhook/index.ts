import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * M-PESA Callback Webhook Edge Function
 * This endpoint is hit by Safaricom Daraja API servers asynchronously.
 */
serve(async (req) => {
    try {
        // 1. **Security**: We can't explicitly rely on auth headers from Safaricom.
        // To secure this endpoint, Daraja IPs should be whitelisted at an API gateway if possible,
        // or you can rely on the fact that ONLY successful webhook payloads matching a pending CheckoutRequestID 
        // in our DB will trigger an update. We initialize Supabase with the SERVICE_ROLE to bypass RLS.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const callbackData = await req.json()
        const stkCallback = callbackData.Body.stkCallback

        const checkoutRequestId = stkCallback.CheckoutRequestID
        const resultCode = stkCallback.ResultCode // 0 means Success, anything else is an error (e.g., 1032 user cancelled)

        // 2. **Prevent Double Processing**: Check DB state first.
        // If the payment is already marked as 'paid', we gracefully return 200 so Safaricom stops retrying.
        const { data: existingPayment, error: fetchError } = await supabaseAdmin
            .from('payments')
            .select('id, status, booking_id')
            .eq('provider_reference', checkoutRequestId)
            .single()

        if (fetchError || !existingPayment) {
            throw new Error('Payment reference not found in pending state')
        }

        if (existingPayment.status === 'paid' || existingPayment.status === 'failed') {
            return new Response('Already Processed', { status: 200 })
        }

        if (resultCode === 0) {
            // --- SUCCESS PAYMENT ---

            // Let's grab the actual M-PESA Receipt number from the Payload metadata
            const metadata = stkCallback.CallbackMetadata.Item
            const receiptObj = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')
            const mpesaReceipt = receiptObj ? receiptObj.Value : null

            // 1. Update Payment table to 'paid'
            await supabaseAdmin
                .from('payments')
                .update({ status: 'paid', provider_reference: mpesaReceipt }) // Overwrite reference with actual receipt
                .eq('id', existingPayment.id)

            // 2. Update Booking table state machine from 'accepted' -> 'confirmed'
            await supabaseAdmin
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('id', existingPayment.booking_id)

        } else {
            // --- FAILED PAYMENT ---
            // E.g. Customer cancelled the prompt, or insufficient funds
            await supabaseAdmin
                .from('payments')
                .update({ status: 'failed' })
                .eq('id', existingPayment.id)

            // The booking status can technically remain 'accepted' allowing the customer to retry later,
            // or a cron job can clean it up after 48 hours.
        }

        // Safaricom expects a standard JSON acknowledgment
        return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('M-PESA Webhook Error:', error)
        // Return 500 so Safaricom knows to retry the webhook payload if something randomly broke
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
