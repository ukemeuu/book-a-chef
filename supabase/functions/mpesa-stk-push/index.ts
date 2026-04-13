import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * M-PESA Auth Token Generator
 */
async function getMpesaToken(): Promise<string> {
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!
    const auth = btoa(`${consumerKey}:${consumerSecret}`)

    // Use sandbox url for dev, production url for live
    const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${auth}`,
        },
    })

    const data = await response.json()
    return data.access_token
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Ensure the user is authenticated to trigger a push
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const { phoneNumber, amount, bookingId } = await req.json()

        // 1. Generate M-PESA Auth Token
        const token = await getMpesaToken()

        // 2. Prepare STK Push Payload
        const shortCode = Deno.env.get('MPESA_SHORTCODE')!
        const passkey = Deno.env.get('MPESA_PASSKEY')!
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
        const password = btoa(`${shortCode}${passkey}${timestamp}`)

        // The callback endpoint where Safaricom will send the success/failure receipt
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-webhook`

        // 3. Trigger Daraja API STK Push
        const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount, // KES
                PartyA: phoneNumber, // 2547XXXXXXXX
                PartyB: shortCode,
                PhoneNumber: phoneNumber,
                CallBackURL: callbackUrl,
                AccountReference: bookingId, // Appears on the user's phone prompt
                TransactionDesc: 'ChefNyumbani Booking Deposit',
            }),
        })

        const stkData = await stkResponse.json()

        if (stkData.ResponseCode !== '0') {
            throw new Error(`M-PESA Error: ${stkData.errorMessage}`)
        }

        // 4. Log the pending payment to our DB, using the CheckoutRequestID to match the webhook later
        const checkoutRequestId = stkData.CheckoutRequestID

        const { error: dbError } = await supabaseClient
            .from('payments')
            .insert({
                booking_id: bookingId,
                customer_id: user.id,
                amount: amount,
                status: 'pending',
                provider: 'mpesa',
                provider_reference: checkoutRequestId
            })

        if (dbError) throw dbError

        return new Response(JSON.stringify({ success: true, checkoutRequestId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
