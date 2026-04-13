# Product Specification: Kenyan Private Chef Marketplace

## 1. Brand Name Ideas
- **ChefNyumbani** (Direct and local: "Chef at Home")
- **KaribuChef** (Welcoming and hospitable)
- **TasteKenya Private** (Focuses on local culinary experiences)
- **JikoniLink** ("Kitchen Link")
- **PikaPro Kenya** ("Cook Pro")
- **Nairobi Nomad Chefs** (Specific to a premium, mobile chef aesthetic)

## 2. Recommended Value Proposition
> **"Experience restaurant-quality dining in the comfort of your home. Connect with Kenya's top private chefs for personalized meals, unforgettable events, and authentic culinary experiences."**

---

## 3. Platform Architecture & Layouts

### 3.1. Homepage Layout
- **Header Navigation:** Logo (Left), "Find a Chef", "Cuisines", "How it Works", "For Chefs" (Right), "Log In", "Sign Up" (CTA button).
- **Hero Section:**
  - *Background:* High-quality, appetizing imagery of a chef plating a meal or a beautiful dinner party setting.
  - *Headline:* Bring Kenya’s Best Chefs to Your Table.
  - *Sub-headline:* From intimate dinners in Kilimani to holiday feasts in Diani. Book vetted private chefs for any occasion.
  - *Search Bar:* `[City/Neighborhood Dropdown] | [Event Type] | [Date] | [Search Button]`
- **Trust Signals (As seen in):** Logos of local publications (e.g., Business Daily, EatOut Kenya, Yummy Magazine).
- **How It Works (3 Steps):**
  1. *Discover:* Browse menus and chef profiles in your city.
  2. *Customize & Book:* Chat with the chef to tailor the menu, then book securely.
  3. *Enjoy:* The chef buys ingredients, cooks, serves, and cleans up.
- **Top Rated Chefs Slider:** Carousel of profile cards featuring 4.8+ rated chefs.
- **Browse by Cuisine Categories:** Visual grids for Swahili, Nyama Choma/BBQ, Continental, Indian, Pan-African.
- **Testimonials Section:** User reviews with photos of the food/event.
- **Footer:** Links (About Us, Trust & Safety, FAQ, Contact, Terms of Service), Social Icons, Newsletter Sign-up.

### 3.2. Chef Directory Page Template
- **Page Header:** Dynamic title based on search (e.g., "Private Chefs in Nairobi for Dinner Parties").
- **Sidebar / Top-bar Filters:** (See Section 4 for details).
- **Chef Profile Cards (Grid Layout):**
  - High-quality photo of the chef and a small overlay of their signature dish.
  - Chef Name & Verification Badge.
  - Star Rating & Number of Reviews (e.g., ⭐ 4.9 (34)).
  - Cuisine Tags (e.g., `Swahili`, `Continental`).
  - Pricing: "From KES 3,500 / person".
  - Location/Willingness to travel (e.g., "Nairobi (Travels up to 50km)").
  - Primary CTA: "View Menus".

### 3.3. Chef Profile Pages
- **Hero Banner:** Cover photo of the chef's best dish, overlapping with a circular Headshot.
- **Header Info:** Name, Rating, Quick Stats (e.g., "50+ Bookings"), "Share", "Favorite" icon.
- **About the Chef (Bio):** Personal story, culinary background, and philosophy.
- **Specialties & Tags:** Dietary expertise (Vegan, Halal, Gluten-Free).
- **Menu Offerings:** 
  - Segmented by categories (e.g., "3-Course Plated", "Family Style", "BBQ Feast").
  - Each menu expands to show courses (Starter, Main, Dessert) and price per person.
- **Gallery:** Instagram-style grid of past dishes and events.
- **Reviews:** Written feedback from past clients.
- **Sticky Booking Sidebar (Right side on Desktop, Bottom sheet on Mobile):**
  - Availability Calendar (Dates highlighted or crossed out).
  - Number of Guests dropdown.
  - Select Menu dropdown.
  - "Request to Book" CTA.

---

## 4. Filters & Search Functionality

**Search Parameters:**
- **Location:** Nairobi (Kilimani, Karen, Kileleshwa, Westlands, etc.), Mombasa, Diani, Kisumu, Nakuru, Naivasha.
- **Cuisine Types:** Kenyan Traditional, Swahili Coastal, Continental, Indian, Pan-African, Italian, Vegan/Plant-Based, BBQ/Nyama Choma.
- **Price Range (per person):**
  - $ / Budget: KES 2,500 - KES 4,000
  - $$ / Standard: KES 4,000 - KES 7,500
  - $$$ / Premium: KES 7,500 - KES 15,000+
- **Event Type:** Dinner Party, Romantic Dinner for Two, Birthday Party, Corporate Catering, Weekly Meal Prep.
- **Dietary Preferences:** Halal, Vegan, Vegetarian, Gluten-Free, Nut-Free.

**Example UI Copy for Filters:**
- *Dropdown Placeholder:* "What are you craving?"
- *Filter Button:* "Refine Search" or "Filter Chefs"

---

## 5. Booking Flow & Customer Journey

1. **Request a Booking:** The customer selects a date, guest count, and specific menu from the chef’s profile, and clicks "Request to Book".
2. **Customization & Messaging:** The customer is prompted to add dietary notes or kitchen details (e.g., "We only have an electric stove"). A chat connects them with the chef for any necessary tweaks.
3. **Chef Confirmation:** The chef receives the request, reviews the date and details, and accepts (or proposes a small menu/price adjustment).
4. **Deposit & Payment:** Upon chef acceptance, the customer receives a payment link.
   - *Payment Gateway:* M-PESA is mandatory for Kenya, alongside Debit/Credit card (e.g., Paystack, Flutterwave, or Pesapal).
   - *Structure:* A 50% deposit secures the date, with the balance held in escrow and released 24 hours after the event.
5. **Pre-Event:** The chef handles ingredient shopping. Platform sends a reminder SMS to the customer 24 hours prior.
6. **Post-Event & Review:** The system automatically requests a rating and review from the customer the morning after the event.

---

## 6. Dashboard Features

### 6.1. Admin Dashboard
- **Chef Onboarding & Vetting:** Approve/Reject applications, verify national ID (KRA PIN) and food handling certificates.
- **Transaction Manager:** Oversee payments, escrow releases, and refunds.
- **Analytics & Earnings:** Gross Merchandise Value (GMV), platform commission tracking.
- **Dispute Resolution / Messaging:** Ability to intervene in Chef-Customer chats if issues arise.

### 6.2. Chef Dashboard
- **Profile Manager:** Update bio, change pricing, upload new menu photos.
- **Calendar & Availability:** Block off dates, set minimum notice periods (e.g., "Requires 48 hours notice").
- **Booking Requests:** Accept/Decline incoming requests.
- **Messaging:** Direct chat with customers for approved/pending bookings.
- **Earnings Wallet:** View upcoming payouts, request withdrawal to M-PESA or Bank Account.

### 6.3. Customer Dashboard
- **My Bookings:** Upcoming and past events with receipt downloads.
- **Inbox:** Conversations with chefs.
- **Saved/Favorites:** Shortlisted chefs and specific menus.
- **Profile & Payment Methods:** Manage dietary restrictions, address book, and saved cards/M-PESA numbers.

---

## 7. Content & Copywriting Drafts

**Homepage Hero Copy:**
- *Headline:* Bring Kenya’s Best Private Chefs to Your Table.
- *Subhead:* Elevate your dinner parties, birthdays, and date nights. Book professional chefs in Nairobi and beyond to shop, cook, and clean up for you.
- *CTA:* Find Your Chef

**Trust Signals Copy:**
- "Vetted Professionals. 100% of our chefs pass rigorous background and tasting checks."
- "Secure Payments. Pay safely via M-PESA or Card. Your money is protected until the meal is served."

**Testimonial Example:**
> *"Chef Wanjiku made our anniversary in Karen absolutely magical. Every dish, from the Swahili starters to the decadent chocolate fondant, was restaurant perfection. Plus, the kitchen was spotless afterwards!"* – Sarah M., Nairobi

---

## 8. Local Kenyan SEO Keywords

**Primary Keywords (Homepage):**
- Private chef Nairobi
- Hire a chef in Kenya
- Personal chef services Nairobi
- Private dining Nairobi
- Catering services for small events Kenya

**Secondary/Long-Tail Keywords (Directory & Profile Pages):**
- Swahili private chef Mombasa
- Private chef for dinner party in Karen
- Nyama choma caterer Naivasha
- Vegan personal chef Nairobi
- Romantic private dinner chef Diani

---

## 9. Monetization Model Suggestions

1. **Commission on Bookings:** The platform takes a 15% - 20% cut from the total booking value (inclusive of ingredient markup).
2. **Customer Service Fee:** An 8% "Trust and Support" fee appended to the customer's checkout total (similar to Airbnb).
3. **Featured Placement (Promoted Listings):** Chefs can pay a small weekly fee (e.g., KES 1,000) or a higher commission rate to appear at the top of directory search results.
4. **Subscription Tiers (B2B):** A "Corporate / Premium" tier for weekly corporate lunch deliveries or recurring meal prep where the platform charges a fixed monthly retainer.

---

## 10. Sample JSON Schema for Chef Profiles

This powers the search/filter logic and frontend rendering:

```json
{
  "chef_id": "c_987654",
  "first_name": "Amina",
  "last_name": "Hassan",
  "brand_name": "Taste of the Coast",
  "bio": "Specializing in authentic Swahili cuisine infused with modern culinary techniques.",
  "location": {
    "city": "Mombasa",
    "neighborhood": "Nyali",
    "travel_radius_km": 30
  },
  "metrics": {
    "rating": 4.9,
    "review_count": 87,
    "completed_bookings": 102
  },
  "pricing": {
    "currency": "KES",
    "starting_price_per_person": 3500
  },
  "attributes": {
    "cuisines": ["Swahili", "Seafood", "Halal"],
    "event_types": ["Dinner Party", "Holiday Meal", "Wedding Prep"],
    "dietary_options": ["Halal", "Gluten-Free"]
  },
  "availability": {
    "minimum_notice_hours": 72,
    "blackout_dates": ["2026-12-25", "2026-12-31"]
  },
  "menus": [
    {
      "menu_id": "m_1122",
      "title": "Mombasa Sunset Feast",
      "description": "A 3-course authentic Swahili experience featuring fresh Indian Ocean seafood.",
      "price_per_person": 4500,
      "courses": {
        "starter": "Viazi Karai with Tamarind Chutney",
        "main": "Samaki wa Kupaka with Coconut Rice",
        "dessert": "Mahamri alongside Cardamom Chai"
      }
    }
  ]
}
```

---

## 11. Draft UI Wireframes

### Desktop Web Wireframe
```text
+-----------------------------------------------------------------------------+
| [LOGO]       Find a Chef | Cuisines | How it Works |        [Log In] [Sign Up] |
+-----------------------------------------------------------------------------+
|                                                                             |
|                    BRING KENYA'S BEST CHEFS TO YOUR TABLE                   |
|       Elevate your dinners. Book vetted chefs to shop, cook, and clean.     |
|                                                                             |
|      +---------------------------------------------------------------+      |
|      | Location (e.g., Nairobi v) | Date [ ] | Guests [v] | [ SEARCH ]|      |
|      +---------------------------------------------------------------+      |
|                                                                             |
+-----------------------------------------------------------------------------+
|  TRUSTED BY:   [EatOut Logo]   [Business Daily]   [Yummy Magazine]          |
+-----------------------------------------------------------------------------+
|                            HOW IT WORKS                                     |
|                                                                             |
|   1. Discover         2. Customize & Book       3. Enjoy                    |
|   (Icon: Search)      (Icon: Chat/Pay)          (Icon: Plate/Wine)          |
+-----------------------------------------------------------------------------+
|                          TOP RATED CHEFS                                    |
|                                                                             |
|   +-------------------+  +-------------------+  +-------------------+       |
|   | [ Chef Photo ]    |  | [ Chef Photo ]    |  | [ Chef Photo ]    |       |
|   | Chef Omondi       |  | Chef Amina        |  | Chef Kamau        |       |
|   | ⭐ 5.0 (24)        |  | ⭐ 4.9 (87)        |  | ⭐ 4.8 (41)        |       |
|   | Nyama Choma, BBQ  |  | Swahili, Halal    |  | Continental       |       |
|   | From KES 4,500/pp |  | From KES 3,500/pp |  | From KES 6,000/pp |       |
|   +-------------------+  +-------------------+  +-------------------+       |
+-----------------------------------------------------------------------------+
|                          BROWSE BY CUISINE                                  |
|   [Swahili (Img)]  [Nyama Choma (Img)]  [Continental (Img)]  [Vegan (Img)]  |
+-----------------------------------------------------------------------------+
| [Footer] Links | Support | Become a Chef | Social Icons                     |
+-----------------------------------------------------------------------------+
```

### Mobile Web Wireframe
```text
+--------------------------------+
| [ ☰ Menu ]  [ LOGO ]  [ User ] |
+--------------------------------+
|                                |
|   BRING KENYA'S BEST           |
|   CHEFS TO YOUR TABLE          |
|                                |
|   +------------------------+   |
|   | Search Nairobi...      |   |
|   +------------------------+   |
|   | Date / Guests          |   |
|   +------------------------+   |
|   | [ SEARCH CHEFS ]       |   |
|   +------------------------+   |
|                                |
+--------------------------------+
|        HOW IT WORKS            |
| 1. Discover Chefs              |
| 2. Customize & Pay Securely    |
| 3. Enjoy Restaurant Quality    |
+--------------------------------+
|        TOP CHEFS               |
| +----------------------------+ |
| | [Large Chef Cover Photo]   | |
| | Chef Omondi                | |
| | ⭐ 5.0 • KES 4,500/pp      | |
| | Nyama Choma, Kenyan        | |
| +----------------------------+ |
| +----------------------------+ |
| | [Large Chef Cover Photo]   | |
| | Chef Amina                 | |
| | ⭐ 4.9 • KES 3,500/pp      | |
| | Swahili, Halal             | |
| +----------------------------+ |
+--------------------------------+
```

### Chef Directory Page Wireframe (Desktop)
```text
+-----------------------------------------------------------------------------+
| [LOGO]       Find a Chef | Cuisines | How it Works |        [Log In] [Sign Up] |
+-----------------------------------------------------------------------------+
| Home > Nairobi > Dinner Party                                               |
|                                                                             |
| +-------------------------+ +---------------------------------------------+ |
| | FILTERS                 | | 14 Private Chefs in Nairobi                 | |
| |                         | |                                             | |
| | [ Location Dropdown ]   | | +-------------------+ +-------------------+ | |
| | [ Date Picker ]         | | | [Cover Image]     | | [Cover Image]     | | |
| | [ Guests Dropdown ]     | | | (Chef Headshot)   | | (Chef Headshot)   | | |
| |                         | | | Chef Amina Hassan | | Chef David Omondi | | |
| | Cuisine Type:           | | | ⭐ 4.9 (87)        | | ⭐ 5.0 (24)        | | |
| | [x] Swahili             | | | Swahili, Coastal  | | Nyama Choma, BBQ  | | |
| | [ ] Continental         | | | KES 3,500/guest   | | KES 4,500/guest   | | |
| | [ ] Indian              | | | [ VIEW PROFILE  ] | | [ VIEW PROFILE  ] | | |
| |                         | | +-------------------+ +-------------------+ | |
| | Dietary:                | |                                             | |
| | [ ] Halal               | | +-------------------+ +-------------------+ | |
| | [ ] Vegan               | | | [Cover Image]     | | [Cover Image]     | | |
| |                         | | | ...               | | ...               | | |
| | Price Range:            | | +-------------------+ +-------------------+ | |
| | [----O---------O----]   | |                                             | |
| +-------------------------+ +---------------------------------------------+ |
+-----------------------------------------------------------------------------+
```

### Chef Profile Page Wireframe (Desktop)
```text
+-----------------------------------------------------------------------------+
| [LOGO]       Find a Chef | Cuisines | How it Works |        [Log In] [Sign Up] |
+-----------------------------------------------------------------------------+
| [                           LARGE COVER PHOTO                               ] |
| [                          (Dish presentation)                              ] |
+-----------------------------------------------------------------------------+
|                                                           |                 |
|   (O) CHEF AMINA HASSAN                                   | +-------------+ |
|   ⭐ 4.9 (87 reviews) • Mombasa (Travels to Nairobi)       | | BOOK CHEF   | |
|                                                           | |             | |
|   ABOUT THE CHEF                                          | | Date: [ ]   | |
|   "I specialize in authentic coastal Swahili dishes,      | | Guests: [ ] | |
|   bringing family recipes to your modern dinner table."   | | Menu: [v]   | |
|                                                           | |             | |
|   SPECIALTIES                                             | | [REQUEST TO | |
|   [Swahili] [Seafood] [Halal]                             | |   BOOK]     | |
|                                                           | |             | |
|   -----------------------------------------------------   | | *No charge  | |
|                                                           | |  yet*       | |
|   MENUS (Select one to book)                              | +-------------+ |
|                                                           |                 |
|   v Mombasa Sunset Feast .............. KES 4,500/guest   |                 |
|      Starter: Viazi Karai with Tamarind Chutney           |                 |
|      Main: Samaki wa Kupaka with Coconut Rice             |                 |
|      Dessert: Mahamri alongside Cardamom Chai             |                 |
|                                                           |                 |
|   > Swahili Vegan Delight ............. KES 3,800/guest   |                 |
|                                                           |                 |
|   -----------------------------------------------------   |                 |
|                                                           |                 |
|   GALLERY                                                 |                 |
|   [Img 1] [Img 2] [Img 3] [Img 4]                         |                 |
|                                                           |                 |
|   -----------------------------------------------------   |                 |
|                                                           |                 |
|   REVIEWS (87)                                            |                 |
|   "Amazing food, Chef Amina was so professional..."       |                 |
+-----------------------------------------------------------------------------+
```

### Customer Dashboard Wireframe (Desktop)
```text
+-----------------------------------------------------------------------------+
| [LOGO]       Find a Chef                [Messages] [Profile] [Settings]       |
+-----------------------------------------------------------------------------+
|                                                                             |
| +-------------------------+ +---------------------------------------------+ |
| | NAVIGATION              | | MY BOOKINGS                                 | |
| | > My Bookings           | |                                             | |
| | > Inbox (2 unread)      | | UPCOMING                                    | |
| | > Saved Chefs           | | +-----------------------------------------+ | |
| | > Profile Settings      | | | Date: Dec 15, 2026 | Status: [CONFIRMED]| | |
| | > Payment Methods       | | | Chef Amina Hassan - 8 Guests            | | |
| |                         | | | Menu: Mombasa Sunset Feast              | | |
| |                         | | | Total: KES 36,000 (KES 18,000 paid)     | | |
| |                         | | | [ MESSAGE CHEF ] [ VIEW RECEIPT ]       | | |
| |                         | | +-----------------------------------------+ | |
| |                         | |                                             | |
| |                         | | PAST BOOKINGS                               | |
| |                         | | +-----------------------------------------+ | |
| |                         | | | Date: Oct 10, 2026 | Status: [COMPLETED]| | |
| |                         | | | Chef Omondi - 4 Guests                  | | |
| |                         | | | [ LEAVE REVIEW ] [ BOOK AGAIN ]         | | |
| |                         | | +-----------------------------------------+ | |
| +-------------------------+ +---------------------------------------------+ |
+-----------------------------------------------------------------------------+
```
