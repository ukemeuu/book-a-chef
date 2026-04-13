# Production Hardening Checklist: ChefNyumbani

Before driving real traffic and processing real KES/USD, run through this checklist to ensure the Next.js/Supabase architecture is secure, performant, and reliable.

## 1. Security & Authentication Checklist
- [ ] **MFA for Admins:** Enforce Multi-Factor Authentication on Supabase for any Admin accounts.
- [ ] **Supabase Custom Domain:** Set up a custom domain (e.g., `api.chefnyumbani.com`) for Supabase so auth cookies aren't blocked by Safari ITP.
- [ ] **Stripe/M-PESA Webhook Integrity:** 
  - Ensure Edge Functions verify the `Stripe-Signature` header using the webhook secret.
  - Whitelist Safaricom Daraja IP addresses on the Supabase/API Gateway side if possible, or heavily rely on the `CheckoutRequestID` validation against DB state.
- [ ] **JWT Expiry:** Ensure Supabase JWT expiration is appropriately set (default 1 hour is usually fine).
- [ ] **CORS Headers:** Explicitly whitelist `https://chefnyumbani.com` in Supabase API settings and Edge Functions. Do not leave `*`.

## 2. Row Level Security (RLS) Audit (CRITICAL)
- [ ] Try to query `bookings` without an `Authorization` header. It must return `[]`.
- [ ] Log in as `Customer A`. Try to `UPDATE public.bookings SET status='disputed' WHERE customer_id = 'Customer B'`. It must fail.
- [ ] Ensure `payments` table inserts from the frontend are blocked or severely restricted. Only Edge Functions (Service Role) should mark payments as `paid`.
- [ ] Ensure Chefs cannot maliciously update their `rating` or `review_count` via the frontend API.

## 3. Environment Variables Strategy
- [ ] **Never commit `.env.local`.**
- [ ] Vercel Environment specific variables:
  - `NEXT_PUBLIC_SITE_URL` dynamically points to the Vercel branch URL for previews, and the production URL for main.
  - Development branches use Stripe Test Keys (`sk_test_...`) and Daraja Sandbox Keys.
  - `main` branch uses Stripe Live Keys (`sk_live_...`) and Daraja Production Keys.
- [ ] **Supabase Service Role Key:** `SUPABASE_SERVICE_ROLE_KEY` MUST NEVER be exposed to the Next.js client (`NEXT_PUBLIC_...`). It should only live inside Stripe/M-PESA Edge functions.

## 4. Performance Optimizations (Next.js App Router)
- [ ] **Image Optimization:** Use Next.js `<Image />` for all Chef Headshots and Menu Galleries. Specify width/height to prevent layout shifts. Store assets on Supabase Storage using a CDN.
- [ ] **Pagination/Infinite Scroll:** The `/chefs` directory query must utilize `.range()` limits. Never dump 100+ chefs on the first render.
- [ ] **React Server Components (RSC):** The Homepage and Chef Directory should be mostly Server Components, fetching directly from Supabase to provide SEO-friendly HTML to crawlers.
- [ ] **Vercel Caching:** Utilize `revalidatePath` after a Chef updates their menu, rather than opting out of all caching.

## 5. Rate Limiting & Abuse Prevention
- [ ] **Auth Rate Limiting:** Enforce Supabase Email Rate Limits (e.g., max 3 password reset emails per hour) to prevent spam.
- [ ] **Edge API Rate Limiting:** Use Vercel Edge Middleware or Upstash Redis to rate limit the `/api/book` endpoint. Prevents malicious actors from spamming slot bookings and locking a chef's calendar.

## 6. Observability & Logging Strategy
- [ ] **Sentry Integration:** Install `@sentry/nextjs` to catch unhandled frontend exceptions and React boundary crashes.
- [ ] **Logflare or Axiom:** Connect Supabase database logs to a monitoring platform to track slow SQL queries (e.g., GIN index misses on the cuisines array).
- [ ] **Payment Audit Trail:** Every webhook interaction (M-PESA receipt, Stripe Auth) must insert an overarching log record in a private `audit_logs` table for dispute resolution.
