# AGENTS.md

## Project

Book A Chef Kenya — a directory of verified private chefs, modelled on a listing site like nairobihot.com. Customers **browse chef profiles**, see what they cook (cuisines and menus), and **contact them directly by phone or WhatsApp**. There is no booking, payment, or dispatch flow on the site.

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
4. Run schema migrations in order: `schema.sql` → `uber_dispatch_schema.sql` → `dispatch_log.sql` → `concierge_inquiries_rls.sql` → `marketplace_schema.sql` → `directory_schema.sql`.

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
- **Directory flow**: Customer browses `/chefs` → views `/chefs/[slug]` → calls or WhatsApp the chef directly. No booking form, no availability calendar, no payment.
- **Chef profiles**: `/chefs/[slug]` is a public, server-rendered page. Only verified chefs are addressable. The chef's slug is generated at listing creation (`utils/marketplace.ts` → `slugify`).
- **Contact**: Profiles show the chef's phone number with `tel:` and `wa.me` links (`chefTelUrl`, `chefWhatsAppUrl`, `formatPhone` in `utils/marketplace.ts`). Chefs set their number in the chef dashboard; new applicants provide it on the apply form.
- **Default imagery**: When a chef has no photo, the Book A Chef logo (`/icon.png`) is used — see `DEFAULT_CHEF_IMAGE`, `chefAvatar`, `chefCover` in `utils/marketplace.ts` and `DEFAULT_CHEF_AVATAR` in `utils/chefApplication.ts`.
- **Verification**: Chefs apply at `/apply` → `POST /api/chef/apply` creates the account + application → admin reviews in `/admin` → `POST /api/admin/chef-actions` (`action: "approve"`) creates the login + listing. `verified` + `verification_status` on the `chefs` row gate public visibility.
- **Favourites**: Clients can save chefs via `chef_favorites` (see `marketplace_schema.sql`). Toggle at `POST /api/chefs/[slug]/favorite`.
- **Chef dashboard**: `/chef-dashboard` is profile management (identity, contact number, service formats, bio, menus). No booking requests.
- **Admin console**: `/admin` manages the directory — overview, chefs, and applications. No dispatch or bookings.
- **Supabase clients**: `utils/supabase/server.ts` for server components/API routes; `utils/supabase/client.ts` for client components. Both have hardcoded fallback URL/anon key.
- **Database**: `supabase/schema.sql` is the base schema. `uber_dispatch_schema.sql` makes `chef_id` nullable and adds dispatch columns. `dispatch_log.sql` creates the dispatch tracking table. `concierge_inquiries_rls.sql` holds RLS policies. `marketplace_schema.sql` adds `chef_favorites` and marketplace indexes. `directory_schema.sql` syncs `reviews_count` and keeps it in sync via trigger.
- **Chef catalog**: `utils/data.ts` exports `INITIAL_CHEFS` — a local fallback used when a DB lookup fails. Don't remove it.

## Gotchas

- `tsconfig.json` has `strict: false`.
- `chefs.reviews_count` is a denormalized counter. The public profile uses the actual `reviews` array length, never `reviews_count`. `directory_schema.sql` adds a trigger to keep the counter in sync.
- Chef profile readiness (`utils/profileReadiness.ts`) requires ≥ 97% completion to "go live".
- Old booking routes redirect: `/book/[slug]` → `/chefs/[slug]`, `/request` → `/chefs`, `/request/status` → `/chefs`.
- M-Pesa and Resend are no longer used by the public flows; the API routes remain but are unused.
- `next.config.mjs` sets a strict CSP with `'unsafe-inline'` for styles/scripts (required by Tailwind/Next.js). Don't tighten without migrating inline styles.
- The `notifications` table has `email_sent` and `email_sent_at` columns — update these when sending emails via `utils/notifications.ts`.

## Deployment

- Manual ZIP upload via Hostinger hPanel → bookachef.co.ke → Deployments → Redeploy → Upload new files.
- Build command on Hostinger: `npm run build` → output in `.next/`
- `scripts/build-deploy-zip.sh` builds a full ZIP; for the 5 MiB hPanel upload limit use a slim ZIP that excludes unused `public/images/*` (only `/icon.png` and `/favicon.ico` are referenced).
- Environment variables must be set in Hostinger panel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
- `.env.local` and `.env.production` are gitignored — set these in Hostinger's environment configuration.
