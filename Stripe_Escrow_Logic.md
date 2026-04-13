# Stripe Connect Escrow & Split Payment Model

## 1. The Financial Logic
- **Total Booking Value:** KES 10,000
- **Platform Commission:** 18% (KES 1,800)
- **Chef Payout:** 82% (KES 8,200)
- **Payment Lifecycle:** 
  1. Customer pays 50% deposit upfront (KES 5,000) to secure the date.
  2. Customer pays the remaining 50% balance (KES 5,000) 24 hours prior to the event, or it is auto-captured.
  3. All funds sit in the platform's Stripe balance (Escrow).
  4. 24 hours *after* the event is completed successfully, KES 8,200 is transferred to the Chef's connected Stripe account.

## 2. Stripe Account Setup Flow (Standard/Express)
Chefs must create a Stripe Connected account during onboarding:
1. Chef clicks "Set up Payouts" in the Chef Dashboard.
2. Next.js server calls `stripe.accountLinks.create` to generate an onboarding URL.
3. Chef is redirected to Stripe to input ID, Bank details, and KRA PIN.
4. Chef is redirected back to `chefnyumbani.com/dashboard?onboarding=success`.
5. Stripe sends an `account.updated` webhook. We save the `stripe_account_id` to the `chefs` table.

## 3. The Two-Step Checkout Session Logic

**Step 1: The 50% Deposit (Auth & Capture)**
When a chef accepts a booking, the customer clicks "Pay Deposit".
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'kes',
      product_data: { name: '50% Deposit: Chef Omondi' },
      unit_amount: 5000 * 100, // Stripe expects cents/smallest unit
    },
    quantity: 1,
  }],
  mode: 'payment',
  // We DO NOT transfer to the chef yet. Funds stay in platform balance.
  payment_intent_data: {
      metadata: { booking_id: '123', payment_type: 'deposit' } // Used by webhook
  },
  success_url: 'https://chefnyumbani.com/dashboard/bookings?success=true',
  cancel_url: 'https://chefnyumbani.com/dashboard/bookings?canceled=true',
});
```

**Step 2: The Balance Capture**
Customers can return to pay the balance 48 hours before the event via a new Checkout session, or we can use `setup_intents` during the deposit to save the card and auto-charge the balance later via a Stripe `PaymentIntent`.

## 4. Webhook Events to Listen To
A Supabase Edge Function (`/functions/v1/stripe-webhook`) acts as the listener.

- **`checkout.session.completed`**: Customer successfully paid. Extract `metadata.booking_id`. Update DB `payments.status = 'paid'`.
- **`payment_intent.payment_failed`**: Card declined on final balance capture. Alert customer.
- **`account.updated`**: Triggered when a Chef finishes entering bank details. Read `charges_enabled`. If true, update DB `chefs.is_stripe_ready = true`.

## 5. Transfer Logic to Chef Account (Escrow Release)
Once the event is marked `completed` (either manually by admin or via an automated 24-hour cron job):

```typescript
// Calculate the exact amount owed to the chef (Total Session amounts - 18% commission)
const chefPayoutAmount = 8200 * 100; // in cents
const chefStripeAccountId = 'acct_1NXY...'; 

// Trigger the transfer from platform balance to the connected account
const transfer = await stripe.transfers.create({
  amount: chefPayoutAmount,
  currency: 'kes',
  destination: chefStripeAccountId,
  transfer_group: `booking_123`,
  metadata: { booking_id: '123' }
});

// Update our DB to reflect the payout
await supabase.from('payments').insert({
    booking_id: '123', status: 'paid', provider: 'stripe_payout', amount: -chefPayoutAmount
})
```
