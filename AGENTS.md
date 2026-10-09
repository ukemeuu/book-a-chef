# AGENTS.md

## Project

Book A Chef Kenya — an on-demand private chef dispatch platform (Uber/Gwiji model). Customers submit a minimal request (date, time, location, cuisine, guests, budget) and the system automatically matches them with an available chef. No public chef profiles or browsing.

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

No test suite, no CI, no pre-commit hooks.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase URL + anon key.
2. `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never expose to client.
3. M-Pesa and Resend are optional; the app degrades gracefully without them.
4. Run schema migrations in order: `schema.sql` → `uber_dispatch_schema.sql` → `dispatch_log.sql` → `concierge_inquiries_rls.sql`.

## Design System (Airbnb-style)

- **Light surfaces only.** Page background is `cream-50`; cards are `bg-white rounded-2xl border border-forest-100`. Never use dark `forest-950` page backgrounds outside the Navbar/Footer and dark hero bands.
- **Radii:** `rounded-2xl` (16px) for cards/modals. Do not reintroduce `rounded-[32px]` / `rounded-[36px]`.
- **Typography:** Sans-serif throughout (`font-sans`). Do not reintroduce `font-serif` headings — that was the pre-redesign style. Headings are `font-bold tracking-tight`, not `font-black`.
- **Tabs:** Underline style (`border-b-2` + `border-forest-950` when active). Do not reintroduce pill-shaped tab buttons.
- **Primary button:** `bg-forest-950 text-white rounded-xl hover:bg-forest-800`, full-width in forms.
- **Status badges:** small pills using human-readable labels (e.g. "Finding your chef"), never raw status strings like `pending_assignment`.
- **Full spec:** see `DESIGN.md`.

## Architecture

- **Auth**: Supabase Auth. Roles (`client`, `chef`, `admin`) in `profiles` table. `middleware.ts` guards `/admin`, `/chef-dashboard`, `/dashboard`, `/login`.
- **Booking flow**: Customer must be signed in (Gwiji-style auth guard) → submits `/request` form → `POST /api/bookings/create` creates booking with `status: pending_assignment` → `matchChefToBooking()` in `utils/dispatch.ts` auto-assigns best-matching chef → chef accepts via `POST /api/bookings/[id]/accept` → client pays via M-Pesa escrow.
- **No restaurant partnerships**: This is a pure independent-chef dispatch platform. No restaurant onboarding, no restaurant profiles, no "Become a Chef" flow.
- **Uber-style dispatch**: Chefs are paired with requests automatically. Customer never selects a chef — they submit requirements and the system matches.
- **WhatsApp notifications**: Timely WhatsApp updates must be sent when: booking is created, chef is assigned, chef accepts, payment is received, and booking status changes. Use the WhatsApp Business API or wa.me links for handoff.
- **Home page**: No "For Diners & Hosts" or "For Restaurants" sections. Single CTA: "Request a Chef" → sign-in → booking form.
- **Dispatch matching**: `utils/dispatch.ts` scores chefs by cuisine match (40pts), location (30pts), budget fit (20pts), rating (10pts), availability (10pts). Called fire-and-forget from `bookings/create`.
- **Chef claiming**: Chefs can claim unassigned `pending_assignment` bookings via the accept endpoint (RLS allows `UPDATE` where `status = 'pending_assignment' AND chef_id IS NULL`).
- **Re-matching**: If a chef declines an unassigned booking, status resets to `pending_assignment` and matching re-triggers.
- **WhatsApp handoff**: `bookings/create` returns a `wa.me` link. `bookings/[id]/accept` also returns a `wa.me` link for the client to confirm with the chef.
- **Status polling**: `/request/status` page polls `GET /api/dispatch/status?booking_id=xxx` every 5s.
- **Supabase clients**: `utils/supabase/server.ts` for server components/API routes; `utils/supabase/client.ts` for client components. Both have hardcoded fallback URL/anon key.
- **Database**: `supabase/schema.sql` is the base schema. `uber_dispatch_schema.sql` makes `chef_id` nullable and adds dispatch columns. `dispatch_log.sql` creates the dispatch tracking table. `concierge_inquiries_rls.sql` holds RLS policies.
- **Chef catalog**: `utils/data.ts` exports `INITIAL_CHEFS` — a local fallback used when a DB lookup fails. Don't remove it.

## Gotchas

- `tsconfig.json` has `strict: false`.
- Chef profile readiness (`utils/profileReadiness.ts`) requires ≥ 97% completion to "go live".
- Bookings without a `chef_id` get status `pending_assignment` (dispatch flow).
- `/api/bookings/create` returns a `wa.me` WhatsApp link — the frontend depends on this.
- M-Pesa runs in sandbox by default (`MPESA_ENVIRONMENT=sandbox`). Callback URL is `https://bookachef.co.ke/api/payments/mpesa/callback`.
- Emails via Resend fail silently if `RESEND_API_KEY` is unset — booking/payment flows must not depend on email success.
- `next.config.mjs` sets a strict CSP with `'unsafe-inline'` for styles/scripts (required by Tailwind/Next.js). Don't tighten without migrating inline styles.
- The `notifications` table has `email_sent` and `email_sent_at` columns — update these when sending emails via `utils/notifications.ts`.

## Deployment

- Git-based deployment via Hostinger hPanel Git Deployment feature.
- Build command: `npm run build` → output in `.next/`
- Environment variables must be set in Hostinger panel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- `.env.local` and `.env.production` are gitignored — set these in Hostinger's environment configuration.
