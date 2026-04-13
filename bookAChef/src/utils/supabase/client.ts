import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase Client for use in Client Components.
 * Can be used in useEffect, click handlers, etc.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
