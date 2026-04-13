// ==============================================================================
// BOOK A CHEF: TYPESCRIPT SCHEMAS & INTERFACES (SUPABASE MVP)
// ==============================================================================

/**
 * Custom Enums matching the PostgreSQL Schema
 */
export type UserRole = 'chef' | 'customer' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type CourseType = 'starter' | 'main' | 'dessert' | 'side';

/**
 * 1. PROFILES
 * Central user table extending Auth users.
 */
export interface Profile {
    id: string; // UUID from auth.users
    role: UserRole;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    avatar_url?: string | null;
    created_at: string; // ISO 8601 Date String
    updated_at: string; // ISO 8601 Date String
}

/**
 * 2. CHEFS
 * Extended data for chefs, tied 1:1 with Profiles.
 */
export interface Chef extends Profile {
    brand_name?: string | null;
    bio?: string | null;
    city: string;
    neighborhood?: string | null;
    travel_radius_km: number;
    cuisines: string[]; // e.g., ['Swahili', 'Nyama Choma']
    dietary_options: string[]; // e.g., ['Halal', 'Vegan']
    is_verified: boolean;
    rating: number; // e.g., 4.90
    review_count: number;
}

/**
 * 3. MENUS
 * A specific menu offering belonging to a Chef.
 */
export interface Menu {
    id: string; // UUID
    chef_id: string; // UUID
    title: string;
    description?: string | null;
    price_per_person: number;
    currency: string; // Default: 'KES'
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * 4. MENU ITEMS
 * Individual courses belonging to a Menu.
 */
export interface MenuItem {
    id: string; // UUID
    menu_id: string; // UUID
    course_type: CourseType;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * 5. AVAILABILITY SLOTS
 * Calendar slots blocked or opened by the Chef.
 */
export interface AvailabilitySlot {
    id: string; // UUID
    chef_id: string; // UUID
    start_time: string; // ISO 8601 Date String
    end_time: string;   // ISO 8601 Date String
    is_booked: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * 6. BOOKINGS
 * The core transaction state linking Customer, Chef, and Menu.
 */
export interface Booking {
    id: string; // UUID
    customer_id: string; // UUID
    chef_id: string; // UUID
    menu_id: string; // UUID
    event_time: string; // ISO 8601 Date String
    guest_count: number;
    total_amount: number;
    status: BookingStatus;
    special_requests?: string | null;
    location_address: string;
    created_at: string;
    updated_at: string;
}

/**
 * 7. PAYMENTS
 * Handles deposits and final payments via Stripe or M-PESA.
 */
export interface Payment {
    id: string; // UUID
    booking_id: string; // UUID
    customer_id: string; // UUID
    amount: number;
    currency: string; // Default: 'KES'
    status: PaymentStatus;
    provider: string; // 'stripe' | 'mpesa' | etc.
    provider_reference?: string | null; // M-PESA Receipt No. or Stripe Session ID
    created_at: string;
    updated_at: string;
}

/**
 * 8. REVIEWS
 * Post-event feedback left by Customers for Chefs.
 */
export interface Review {
    id: string; // UUID
    booking_id: string; // UUID (Unique 1:1)
    customer_id: string; // UUID
    chef_id: string; // UUID
    rating: number; // 1-5
    comment?: string | null;
    created_at: string;
    updated_at: string;
}
