# Book A Chef — Design System & Screen Specifications

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `forest-950` | `#0e1f17` | Dark backgrounds, hero sections |
| `forest-900` | `#1d382b` | Primary text on light, dark section backgrounds |
| `forest-800` | `#234433` | Headings on light backgrounds |
| `forest-700` | `#2a543e` | Emphasis text, borders |
| `forest-600` | `#346a4d` | Interactive elements |
| `forest-500` | `#468461` | Links, accents |
| `forest-100` | `#e1ede6` | Light backgrounds, borders |
| `forest-50` | `#f2f7f4` | Subtle backgrounds |
| `cream-50` | `#fdfcf9` | Page background |
| `cream-100` | `#faf7f2` | Card backgrounds |
| `cream-200` | `#f4ede3` | Borders, dividers |
| `cream-300` | `#ece0cf` | Subtle borders |
| `champagne-500` | `#c9a14c` | Primary CTA, accents |
| `champagne-400` | `#d6b86d` | CTA hover |
| `champagne-300` | `#e2ce95` | Highlights, badges |
| `champagne-200` | `#ede1bd` | Subtle backgrounds |
| `champagne-100` | `#f6f1de` | Card backgrounds |
| `champagne-50` | `#fbf9f1` | Subtle backgrounds |
| `red-900/30` | `bg-red-900/30` | Error states |
| `red-800` | — | Error borders |
| `red-400` | — | Error text |
| `red-300` | — | Error text light |
| `emerald-600` | — | Success buttons |
| `emerald-500/20` | — | Success badges |
| `emerald-500/40` | — | Success borders |
| `emerald-500` | — | Success accents |
| `emerald-400` | — | Chef card accents |
| `emerald-300` | — | Success text |
| `emerald-50` | — | Success backgrounds |
| `white` | `#ffffff` | Cards, text on dark |
| `amber-900` | — | Warning text |
| `amber-100` | — | Warning backgrounds |
| `blue-700` | — | Info badges |
| `blue-50` | — | Info backgrounds |
| `red-800` | — | Danger badges |
| `red-50` | — | Danger backgrounds |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| H1 (Hero) | Playfair Display | 3xl–7xl | Black (900) | 1.15 |
| H2 (Section) | Playfair Display | 3xl–5xl | Bold (700) | 1.2 |
| H3 (Card) | Playfair Display | 2xl–3xl | Bold (700) | 1.3 |
| Body | Plus Jakarta Sans | sm–base | Medium (500) | 1.6 |
| Body Bold | Plus Jakarta Sans | xs–sm | Bold (700) | 1.4 |
| Label | Plus Jakarta Sans | xs | Black (900) + uppercase | 1.2 |
| Button | Plus Jakarta Sans | xs–sm | Black (900) + uppercase | 1 |
| Caption | Plus Jakarta Sans | 9px–11px | Normal (400) | 1.4 |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `section-py` | `py-16` to `py-20` | Section vertical padding |
| `container` | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | Content container |
| `card-p` | `p-6` to `p-10` | Card padding |
| `gap-section` | `gap-8` to `gap-14` | Between sections |
| `gap-card` | `gap-4` to `gap-6` | Within cards |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-xl` | `0.5rem` | Small elements, inputs |
| `rounded-2xl` | `1rem` | Cards, buttons |
- `rounded-3xl` | `1.5rem` | Large cards |
| `rounded-full` | `9999px` | Pills, buttons, avatars |
| `rounded-[32px]` | `2rem` | Hero cards |
| `rounded-[36px]` | `2.25rem` | CTA banners |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | Subtle | Cards at rest |
| `shadow-md` | Low | Interactive elements |
| `shadow-lg` | Medium | Hover states |
| `shadow-xl` | High | Modals, floating elements |
| `shadow-2xl` | Highest | Hero cards |
| `shadow-champagne-400/20` | Colored | CTA glow |

---

## Screen Specifications

---

### 1. Home Page (`/`)

**Layout:** Single column, max-width 7xl container

**Sections (top to bottom):**

#### 1.1 Navbar
- **Type:** Sticky, translucent backdrop-blur
- **Height:** ~68px
- **Left:** Logo (ChefHat icon + "Book A Chef" text)
- **Right:** 
  - "Request a Chef" button (champagne-400, rounded-full, px-4 py-2.5)
  - Profile dropdown (avatar + chevron) when logged in
  - "Sign In" button when logged out
- **Mobile:** Hamburger menu → slide-down panel
- **Scroll behavior:** Background transitions from transparent to white/95

#### 1.2 Hero Section
- **Background:** forest-950 with Unsplash image overlay (opacity-30, brightness-75)
- **Content:** Centered, max-width 4xl
  - Badge: "On-Demand Private Chef Dispatch • Nairobi & Coast" (champagne-300, border, rounded-full)
  - H1: "Book a Certified Private Chef **to Your Home.**" (white, champagne-400 italic on second line)
  - Subtext: "Just like Uber or Gwiji for culinary masters..." (cream-200/90)
  - CTA: "Request a Chef" (champagne-400, rounded-full, px-10 py-5, ChefHat icon)
  - 3-Step Explainer Bar (3 columns):
    1. "Make a Request" → "Tell Us Your Event"
    2. "We Match & Dispatch" → "Concierge Assignment"
    3. "Live Tracking & Feast" → "Chef Cooks at Home"
  - Trust badges row: In-Home Dining, Flexible Sourcing, Meal-Tested & Approved

#### 1.3 How It Works
- **Background:** white
- **Header:** "Dining Process" badge + "How In-Home Dining Works" H2
- **Grid:** 4 columns (md), each card:
  - Step number (champagne-600, serif, large)
  - Icon in rounded square
  - Title (serif, bold)
  - Description (forest-600)
- **Steps:**
  1. "Submit Your Request" — ChefHat icon
  2. "We Match & Dispatch" — ShieldCheck icon
  3. "Chef Accepts & Prepares" — Utensils icon
  4. "Cooking & Cleanup" — Sparkles icon

#### 1.4 About Us
- **Background:** cream-50
- **Header:** "Our Story & Mission" badge + "About Us" H2
- **Grid:** 12-col, left 5 = 3 metric cards (2x2 grid), right 7 = large image
- **Metric Cards:**
  - 🍳 "Live Kitchen Tasting" (champagne gradient)
  - 🛡️ "Food Safety & HACCP" (white)
  - 📜 "Background & Safety Compliance" (white)

#### 1.5 Trusted Sourcing
- **Background:** white
- **Header:** "0% Grocery Markup • Sourced by Chef or Host" badge + H2
- **Grid:** 4 columns, each card:
  - Supermarket logo (Carrefour, Chandarana, Naivas, Quickmart)
  - Store name, tagline, description

#### 1.6 Destinations
- **Background:** cream-50/50
- **Header:** "Private Chefs in Kenya" H2
- **Grid:** 4 columns of location links
  - Each: "Chef in" label + location name (links to /request?location=X)
  - "All Destinations →" link at bottom

#### 1.7 Types of Service
- **Background:** white
- **Header:** "Types of Service" H2
- **Grid:** 4 columns of service links
  - Each: Service name + category label (links to /request)

#### 1.8 Bespoke Proposal Banner
- **Background:** forest-900 rounded-[36px]
- **Grid:** 12-col, left 8 = text, right 4 = buttons
- **Left:** "Bespoke Catering & Large Events" label + H2 + description
- **Right:** "Request Custom Proposal" button (opens modal) + "Apply as a Private Chef" link

#### 1.9 Final CTA Banner
- **Background:** forest-900 gradient with blur orbs
- **Content:** Centered
  - Badge: "Private Dining Reimagined"
  - H2: "Ready to Turn Your Dining Room Into Kenya's Finest Restaurant?"
  - Subtext
  - CTA: "Request a Chef" (champagne-400, ChefHat icon)
  - Trust badges: Escrow Protection, Store Till Payment, 97%+ Vetted Chef Roster

#### 1.10 Footer
- **Background:** forest-950
- **Columns:** Logo + description | Quick Links | Contact | Social
- **Bottom:** Copyright + legal links

---

### 2. Login Page (`/login`)

**Layout:** Split screen — left panel (brand) + right panel (form)

#### 2.1 Left Panel (Brand)
- **Background:** forest-950 with subtle image overlay
- **Content:** 
  - Logo
  - "Book A Chef" heading
  - Tagline: "Kenya's Premier Private Chef Marketplace"
  - Feature bullets (3-4 with checkmarks)
  - Testimonial quote

#### 2.2 Right Panel (Form)
- **Background:** white
- **Card:** rounded-[36px], shadow-2xl, border

**Step 1: Select Account Type**
- 2x2 grid of role cards:
  - "Diner / Client" (default)
  - "Chef Partner"
  - "Admin"
  - Each: icon, title, description

**Step 2A: Sign In**
- Email input (with Mail icon)
- Password input (with Lock icon, show/hide toggle)
- "Forgot Password?" link
- "Sign In" button (forest-900, full width)
- "Don't have an account? Sign up" link

**Step 2B: Sign Up**
- Full Name input
- Email input
- Phone input
- Password input
- "Create Account" button
- "Already have an account? Sign in" link

**Step 2C: Forgot Password**
- Email input
- "Send Reset Link" button
- "Back to Sign In" link

**Messages:**
- Error: red-900/30 background, red-300 text
- Success: champagne-100 background, champagne-700 text

---

### 3. Request Chef Page (`/request`)

**Layout:** Single column, max-width lg container

**Background:** forest-950

#### 3.1 Header
- Badge: "On-Demand Chef Dispatch"
- H1: "Request a Private Chef"
- Subtext: "Tell us what you need — we'll match you with the perfect chef."

#### 3.2 Form Card — Event Details
- **Background:** forest-900/50, border forest-800, rounded-2xl
- **Section label:** "Event Details" (champagne-300, uppercase)
- **Fields:**
  - Dining Style: 2 toggle buttons (Home / Delivery)
  - Event Date: date input (min = today + 2 days)
  - Start Time: select dropdown (6 time slots)
  - Location: select dropdown (16 locations)
  - Guests: stepper (− / count / +), min 2, max 80

#### 3.3 Form Card — Cuisine & Preferences
- **Section label:** "Cuisine & Preferences"
- **Fields:**
  - Cuisine Type: 3x3 grid of icon buttons (9 options + "Surprise Me!")
  - Ingredient Sourcing: 2 toggle buttons (Chef shops / I'll provide)
  - Budget per Person: 5 preset buttons + custom input
  - Dietary Requirements: text input (placeholder: "e.g. Halal, Vegan, Nut allergy…")
  - Special Requests: textarea (2 rows)

#### 3.4 Form Card — Your Details
- **Section label:** "Your Details"
- **Fields:**
  - Full Name * (text input)
  - WhatsApp Number * (tel input)
  - Email Address (email input, optional)

#### 3.5 Validation Errors
- Per-field: red-400 text, `data-error` attribute for scroll target
- Submit error: red-900/30 banner

#### 3.6 Submit Button
- "Request a Chef" (champagne-400, full width, ChefHat icon)
- Loading state: spinner + "Submitting…"
- Terms link below

---

### 4. Request Status Page (`/request/status`)

**Layout:** Single column, max-width 4xl container

**Background:** forest-950 (custom `#071611`)

#### 4.1 Header
- Live badge: pulsing emerald dot + "Live Chef Dispatch Tracker" + reference number
- H1: Dynamic based on stage:
  - Stage 1: "Request Logged"
  - Stage 2: "Finding Your Chef…"
  - Stage 3: "Chef Matched!"
  - Stage 4: "Chef Is En Route"
  - Stage 5: "Chef Cooking in Your Kitchen"
- Subtext: Personalized with name, location

#### 4.2 Stepper (Uber-style)
- **Card:** forest-900/60, border forest-800, rounded-3xl
- **Grid:** 5 columns (sm), 2 columns (mobile)
- **Each step:**
  - Icon circle (12x12, rounded-2xl)
    - Past: emerald-500 with checkmark
    - Current: champagne-400 with ring
    - Future: forest-800, opacity-40
  - Step label (champagne-400, uppercase, 10px)
  - Step title (white, xs)
- **Footer:** Current status + "Estimated Concierge SLA: < 30 Minutes"

#### 4.3 Radar Searching Card (Stage 2)
- **Card:** forest-900/40, border forest-800, rounded-3xl
- **Content:**
  - Radar animation: 3 concentric pulsing circles with ChefHat icon
  - "Contacting Available Chefs in {location}…"
  - Description text

#### 4.4 Chef Matched Card (Stage 3+)
- **Card:** gradient forest-900 → forest-950, border champagne-400/40
- **Header:** "Your Assigned Private Chef" + "Confirmed & Ready" badge
- **Content:**
  - Chef avatar (28x28, rounded-3xl, border champagne-400/60)
  - Chef name (serif, 2xl) + "Certified Master" badge
  - Rating (Star icon + rating + review count) + cuisines
  - Action buttons:
    - "Chat with Chef" (champagne-400)
    - "WhatsApp" (emerald-600)
    - "Call Concierge" (forest-800)
- **Chat Drawer:**
  - Message list (max-h-64, overflow-y-auto)
  - Input + Send button

#### 4.5 Event Specs Summary
- **Card:** forest-900/40, border forest-800
- **Grid:** 4 columns
  - Date | Guests | Cuisine | Location

#### 4.6 Footer
- WhatsApp concierge link
- "+ New Request" link
- "Return Home" link

---

### 5. Client Dashboard (`/dashboard`)

**Layout:** Single column, max-width 7xl

**Background:** cream-50

#### 5.1 Header
- Greeting: "Welcome, {name}"
- User avatar + role badge

#### 5.2 Tabs
- "Bookings" | "Messages"

#### 5.3 Bookings Tab
- **Booking Cards:** white, rounded-2xl, border
  - Date, time, guests, location
  - Status badge (color-coded)
  - StatusStepper component
  - Action buttons: Pay (M-Pesa), Cancel, Review
- **Empty state:** illustration + "No bookings yet" + CTA

#### 5.4 Messages Tab
- Chat interface with concierge/chef
- Message bubbles (user: champagne-400, other: forest-100)
- Input + Send button

---

### 6. Chef Dashboard (`/chef-dashboard`)

**Layout:** Single column, max-width 7xl

**Background:** cream-50

#### 6.1 Header
- Chef name + verification badge
- Profile readiness progress bar

#### 6.2 Tabs
- "Bookings" | "Menus" | "Settings"

#### 6.3 Bookings Tab
- **Available Requests:** Cards with pending_assignment status
  - Event details, cuisine, location, budget
  - "Accept" / "Decline" buttons
- **Active Bookings:** Accepted/confirmed bookings
  - Client details, event info
  - Status stepper
  - "Start Cooking" / "Mark En Route" actions

#### 6.4 Menus Tab
- Menu cards: title, price, courses, edit/delete
- "Add Menu" button

#### 6.5 Settings Tab
- Profile form: name, phone, bio, cuisines, price, availability
- Availability: working days, time range, max bookings/day

---

### 7. Chef Application (`/apply`)

**Layout:** Multi-step form, max-width lg

**Background:** forest-950

#### 7.1 Header
- "Become a Chef Partner" H1
- "Join Kenya's finest culinary masters" subtext

#### 7.2 Application Form
- Personal info: name, email, phone, national ID
- Culinary info: cuisines, experience, specialty, bio
- Service details: city, service areas, price, formats
- Documents: food handler cert, portfolio links
- "Submit Application" button

---

### 8. Admin Dashboard (`/admin`)

**Layout:** Full-width with sidebar

**Background:** cream-50

#### 8.1 Sidebar
- Logo
- Navigation: Dashboard, Chefs, Bookings, Applications, Messages, Settings

#### 8.2 Dashboard Tab
- Stats cards: Total Chefs, Active Bookings, Revenue, Pending Applications
- Charts: bookings over time, cuisine distribution
- Recent activity feed

#### 8.3 Chefs Tab
- Table: name, email, city, status, rating, actions
- Filter by status (pending, verified, suspended)
- "Add Chef" button

#### 8.4 Bookings Tab
- Table: ref, client, chef, date, status, amount
- Filter by status

#### 8.5 Applications Tab
- Table: name, email, experience, status, date
- "Approve" / "Reject" actions

---

### 9. Static Pages

#### 9.1 Terms (`/terms`)
- White background, max-width 3xl
- Sections: Acceptance, Services, Payments, Cancellations, Liability, Contact

#### 9.2 Privacy (`/privacy`)
- White background, max-width 3xl
- Sections: Data Collection, Use, Storage, Rights, Contact

#### 9.3 Cancellation Policy (`/cancellation-policy`)
- White background, max-width 3xl
- Refund tiers: >72h (95%), 24-72h (50%), <24h (0%)
- Process steps

---

### 10. Chef Jobs (`/chef-jobs`)

**Layout:** Landing page, max-width 7xl

**Background:** cream-50

#### 10.1 Hero
- "Earn with Book A Chef" H1
- Income calculator (interactive sliders)
  - Dinners/week × Avg guests × Price = Weekly/Monthly income
  - 85% chef payout after 15% platform fee

#### 10.2 Benefits
- Grid of benefit cards

#### 10.3 CTA
- "Apply Now" → `/apply`

---

### 11. Chefs Redirect (`/chefs`)

- **Behavior:** Server-side redirect to `/request`
- **Code:** `redirect("/request")`

---

## Component Library

### Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | champagne-400 | forest-950 | none | Main CTAs |
| Secondary | forest-800/80 | cream-100 | forest-700 | Alt CTAs |
| Outline | transparent | forest-900 | forest-100 | Subtle |
| Ghost | transparent | forest-800 | none | Links |
| Danger | red-600 | white | none | Destructive |

### Cards

| Variant | Background | Border | Usage |
|---------|-----------|--------|-------|
| Light | white | forest-100 | Content cards |
| Dark | forest-900/40 | forest-800 | Dark section cards |
| Accent | champagne-100 | champagne-300 | Highlight cards |
| Success | emerald-50 | emerald-200 | Success states |
| Error | red-50 | red-200 | Error states |

### Badges

| Variant | Background | Text | Usage |
|---------|-----------|------|-------|
| Champagne | champagne-400/20 | champagne-300 | Primary accent |
| Emerald | emerald-500/20 | emerald-300 | Success |
| Red | red-500/20 | red-300 | Error |
| Blue | blue-50 | blue-700 | Info |
| Forest | forest-100 | forest-800 | Neutral |

### Inputs

| Variant | Background | Border | Text |
|---------|-----------|--------|------|
| Default | forest-900 | forest-700 | white |
| Light | cream-50 | forest-100 | forest-950 |
| Error | red-50 | red-400 | red-900 |

### Stepper Component

```
[Circle: step number] —— [Line] —— [Circle: step number] —— [Line] —— [Circle: step number]
```

- Past: emerald-500 filled, checkmark
- Current: champagne-400 filled, ring-4 champagne-400/20
- Future: forest-800, opacity-40

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| `sm` | 640px | 2-column grids |
| `md` | 768px | 3-4 column grids, sidebar appears |
| `lg` | 1024px | Full layout, navigation visible |
| `xl` | 1280px | Max-width containers |

---

## Animations

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `hover-lift` | 250ms | cubic-bezier(0.16, 1, 0.3, 1) | Card hover |
| `pulse` | 1200ms | ease-in-out | Status page radar |
| `ping` | 1000ms | ease-in-out | Live badge |
| `fade-in` | 200ms | ease-out | Chat drawer, modals |
| `scale` | 200ms | cubic-bezier(0.16, 1, 0.3, 1) | Button press |

---

## Interaction States

### Buttons
- **Default:** As specified
- **Hover:** translateY(-2px), shadow increase, color shift
- **Active:** scale-95
- **Disabled:** opacity-50, cursor-not-allowed
- **Loading:** spinner replaces text

### Cards
- **Default:** As specified
- **Hover:** translateY(-4px), shadow increase

### Inputs
- **Default:** As specified
- **Focus:** border-champagne-400, ring-2 ring-champagne-400/20
- **Error:** border-red-400, error message below

### Links
- **Default:** As specified
- **Hover:** text-champagne-600, underline

---

## Accessibility

- **Focus rings:** Always visible, champagne-400
- **Color contrast:** All text meets WCAG AA (4.5:1 minimum)
- **Touch targets:** Minimum 44x44px
- **Keyboard navigation:** All interactive elements focusable
- **Screen readers:** Semantic HTML, aria-labels on icon-only buttons
