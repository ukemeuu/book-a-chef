import { createClient } from '@/utils/supabase/client'
import { Chef, Menu } from '@/types'

/**
 * Filter State Structure used by the Client Component
 */
export interface ChefFilterState {
    location?: string
    cuisines: string[]     // e.g., ['Swahili', 'Italian']
    minPrice?: number
    maxPrice?: number
    minRating: number      // Default: 0
    page: number           // 1-indexed
    limit: number          // Default: 10
}

export interface ChefSearchResult {
    chefs: (Chef & { menus: Pick<Menu, 'id' | 'title' | 'price_per_person'>[] })[]
    totalCount: number
    hasMore: boolean
}

/**
 * Utility to filter Chefs via Supabase Client.
 */
export async function searchChefs(filters: ChefFilterState): Promise<ChefSearchResult> {
    const supabase = createClient()

    const {
        location,
        cuisines,
        minPrice,
        maxPrice,
        minRating = 0,
        page = 1,
        limit = 10,
    } = filters

    const from = (page - 1) * limit
    const to = from + limit - 1

    // 1. Build the base query against the `chefs` table and join `menus` to get pricing
    let query = supabase
        .from('chefs')
        .select(`
      *,
      menus!inner (
        id,
        title,
        price_per_person
      )
    `, { count: 'exact' }) // Request total count for pagination

    // 2. Apply Filters dynamically
    if (location) {
        // Case-insensitive match on city using ilike
        query = query.ilike('city', `%${location}%`)
    }

    if (cuisines && cuisines.length > 0) {
        // Uses the @> operator on the GIN indexed `cuisines` TEXT[] column
        // This finds chefs whose cuisines array contains ALL the requested cuisines
        query = query.contains('cuisines', cuisines)
    }

    if (minRating > 0) {
        query = query.gte('rating', minRating)
    }

    // Filter on joined table (menus) price.
    // Note: We used !inner join above, so this filters out chefs who don't have menus meeting the criteria.
    if (typeof minPrice === 'number') {
        query = query.gte('menus.price_per_person', minPrice)
    }

    if (typeof maxPrice === 'number') {
        query = query.lte('menus.price_per_person', maxPrice)
    }

    // 3. Apply Pagination and Ordering
    const { data, count, error } = await query
        .order('rating', { ascending: false }) // Sort by highest rated
        .range(from, to)

    if (error) {
        console.error('Error fetching chefs:', error)
        throw new Error('Failed to fetch private chefs. Please try again.')
    }

    // 4. Return formatted payload
    return {
        chefs: data as (Chef & { menus: Pick<Menu, 'id' | 'title' | 'price_per_person'>[] })[],
        totalCount: count ?? 0,
        hasMore: count ? (from + limit) < count : false
    }
}
