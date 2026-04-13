# 14-Day Technical MVP Sprint Plan: ChefNyumbani

**Tech Stack:** 
- **Frontend / Fullstack:** Next.js 14+ (App Router), React, Tailwind CSS, TypeScript
- **Backend / Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments:** Stripe Connect (Card / Escrow), Daraja API (Safaricom M-PESA)
- **Deployment:** Vercel

---

## Sprint Overview
The goal of this 14-day sprint is to build a functional **Minimum Viable Product (MVP)** where:
1. Chefs can create a profile and list menus.
2. Customers can filter chefs, view profiles, and request a booking.
3. Customers can pay a deposit (Card or M-PESA) to confirm the booking.

---

### Day 1-2: Project Setup & Database Architecture
**Focus: Scaffolding the repository and defining the Supabase schema.**
- [ ] Initialize Next.js project with Tailwind CSS and Shadcn UI (for quick component access).
- [ ] Set up Supabase project and link it to the local environment.
- [ ] Create Database Schema (Profiles, Menus, Bookings, Payments, Reviews).
- [ ] Setup Row Level Security (RLS) in Supabase to secure user data.
- [ ] Define shared TypeScript interfaces based on the PRD schema.

### Day 3-4: Authentication & Onboarding Flow
**Focus: User registration and role-based routing.**
- [ ] Integrate Supabase Auth (Email/Password & Google OAuth).
- [ ] Build the Multi-step Onboarding Form for Chefs (Bio, location, dietary specialties).
- [ ] Build basic Customer onboarding.
- [ ] Implement role-based redirects (middleware.ts) to route to `/chef-dashboard` vs `/dashboard`.

### Day 5-6: Chef Directory & Search Functionality
**Focus: The core discovery engine.**
- [ ] Build the Homepage UI (Hero, Search Bar, Featured Chefs).
- [ ] Implement the Chef Directory page (`/chefs`).
- [ ] Create server-side filtering logic: query Supabase for locations, cuisines, and price ranges.
- [ ] Build the Chef Profile Card component.

### Day 7-8: Chef Profiles & Menu Management
**Focus: Showcasing the chef's offerings.**
- [ ] Build the public Chef Profile Page (`/chefs/[id]`).
- [ ] Implement Supabase Storage for uploading Chef Headshots and Menu Gallery images.
- [ ] Create the Chef Dashboard page to add/edit/delete Menus and Courses.

### Day 9-10: Booking Flow & Availability
**Focus: The transaction kick-off.**
- [ ] Implement a Booking Widget on the Chef Profile (Select Date, Guests, Menu).
- [ ] Build the Calendar selection logic (preventing overlapping bookings).
- [ ] Create the "Request Booking" Server Action that writes to the `bookings` table with status `pending`.
- [ ] Implement a basic Inbox/Messaging UI on the platform for Chefs to accept/decline requests.

### Day 11-12: Payments Integration (M-PESA & Stripe)
**Focus: Securing the deposit.**
- [ ] **M-PESA Integration:** Write a Supabase Edge Function to hit the Safaricom Daraja API (STK Push) for local deposits. Listen for the callback webhook to update booking status to `confirmed`.
- [ ] **Stripe Integration:** Set up Stripe Checkout sessions for international/card users to pay the 50% deposit.
- [ ] **Escrow Logic:** Ensure funds are held (via Stripe Connect rules or manual admin tracking for M-PESA) until the event is completed.

### Day 13-14: Dashboards, Polish & Deployment
**Focus: Finalizing the MVP experience.**
- [ ] Build the Customer Dashboard (`/dashboard/bookings`) to view receipts and booking status.
- [ ] Build basic Admin Views (approve chefs, track platform GMV).
- [ ] Final UI Polish: add animations, empty states, and error handling.
- [ ] Deploy the application to Vercel and map custom domains.
- [ ] Conduct End-to-End manual testing of the complete user journey.

---

## Post-Sprint Roadmap (V1.1+)
- Advanced messaging (WebSockets / Supabase Realtime).
- Automated review collection post-event.
- Subscription tiers for Promoted Chefs.
- Automated payouts to Chef M-PESA accounts (B2C API).
