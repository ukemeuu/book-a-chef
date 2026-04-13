# The "Concierge" Lean MVP: First 10 Paid Bookings

If the goal is to validate the market, prove liquidity, and secure the first 10 paying customers as fast as possible, you do **not** need the full Supabase/Stripe/M-PESA architecture built over 14 days. You need a "Wizard of Oz" concierge service. 

Here is what you build for Week 1 to acquire 10 bookings manually:

## What to CUT Completely (For Now)
- ❌ **Authentication / Logins:** No need for Supabase Auth, JWTs, or role-based dashboards. 
- ❌ **Automated Payments (Stripe/M-PESA API):** No need to build complex webhooks or escrow logic.
- ❌ **Chef Onboarding Flow:** No need for a chef portal where they upload their own menus.
- ❌ **Availability Calendar Sync:** No complex SQL constraints.
- ❌ **Post-Event Review System:** Handled manually via WhatsApp.

---

## What to BUILD (The 3-Day Technical MVP)

### 1. The Frontend (Next.js + Vercel)
A beautiful, high-trust static website. 
- **Homepage:** Clear value proposition, trust signals, and a "Browse Chefs" CTA.
- **Directory Page:** A hardcoded JSON or simple Supabase query rendering 5-10 *highly* curated, vetted chefs.
- **Profile Page:** Hardcoded menus and beautiful photos.
- **Booking CTA:** Instead of a complex calendar widget, the "Request to Book" button opens a **Typeform** or an integrated **Tally.so / Google Form**.

### 2. The Booking Flow (Concierge Level)
1. **User Submits Form:** Date, Guest Count, Preferred Menu, Neighborhood.
2. **Admin (You) Receives Alert:** The form submission instantly pings your phone (via Zapier or WhatsApp integration).
3. **Admin Checks Availability (Manual):** You open WhatsApp and message the Chef: *"Hey Amina, are you free this Friday evening for 4 guests in Kilimani? Menu is the Seafood Feast."*
4. **Chef Confirms.** 
5. **Admin Sends Payment Link (Manual):** You generate a simple Stripe Payment Link or a direct Safaricom Till Number / Paybill on your business account. You WhatsApp the customer: *"Chef Amina is confirmed! Please pay the 50% deposit [Link] to lock it in."*
6. **Admin Monitors Escrow (Manual):** Once the customer pays, you notify the Chef to buy ingredients. After the event, you manually send the Chef's 82% cut via M-PESA.

---

## Why this works for the First 10 Bookings
- **Speed to Market:** You can launch a static Next.js site with hardcoded JSON chefs in 48 hours.
- **Zero Technical Debt:** You aren't building complex Edge Functions for M-PESA that might break or Stripe Connect logic before you even know if people want the service.
- **High-Touch Customer Experience:** Luxury services (like private chefs) benefit from a "concierge" messaging them on WhatsApp initially. It builds extreme trust. 
- **Feedback Loop:** By being the middleman on WhatsApp between the Chef and Customer, you will learn *exactly* what friction points exist (e.g., allergies, kitchen equipment limitations) before hardcoding those solutions into a database schema.

*Once you hit 10 paid bookings manually, the pain of being the human router will justify investing the 14-day sprint to automate it into the full Supabase architecture.*
