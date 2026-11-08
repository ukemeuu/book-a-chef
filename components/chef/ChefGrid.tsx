"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChefHat } from "lucide-react";
import ChefCard from "./ChefCard";
import { MarketplaceChef } from "@/utils/marketplace";
import { createClient } from "@/utils/supabase/client";
import ChefFilters, { FilterState, DEFAULT_FILTERS } from "./ChefFilters";

/**
 * Marketplace grid with server-backed filtering.
 *
 * Filters are applied server-side via /api/chefs. The favourite state is
 * tracked in a Set so the heart toggles instantly without a refetch.
 */
export default function ChefGrid({
  initialFilters = DEFAULT_FILTERS,
}: {
  initialFilters?: Partial<FilterState>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [chefs, setChefs] = useState<MarketplaceChef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load the user's favourites once.
  useEffect(() => {
    async function loadFavorites() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("chef_favorites")
        .select("chef_id")
        .eq("client_id", user.id);

      if (data) {
        setFavorites(new Set(data.map((f: any) => f.chef_id)));
      }
    }
    loadFavorites();
  }, [supabase]);

  // Fetch chefs whenever filters change.
  useEffect(() => {
    let active = true;

    async function loadChefs() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.cuisine) params.set("cuisine", filters.cuisine);
        if (filters.location) params.set("location", filters.location);
        params.set("sort", filters.sort);
        params.set("limit", "60");

        const res = await fetch(`/api/chefs?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load chefs");

        if (active) setChefs(data.chefs || []);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load chefs");
      } finally {
        if (active) setLoading(false);
      }
    }

    // Debounce the search input.
    const timeout = setTimeout(loadChefs, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [filters]);

  const toggleFavorite = useCallback(
    async (chef: MarketplaceChef, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/chefs");
        return;
      }

      const isFav = favorites.has(chef.id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(chef.id);
        else next.add(chef.id);
        return next;
      });

      try {
        await fetch(`/api/chefs/${chef.slug}/favorite`, { method: "POST" });
      } catch {
        // Revert on failure.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(chef.id);
          else next.delete(chef.id);
          return next;
        });
      }
    },
    [favorites, router, supabase]
  );

  return (
    <div>
      <ChefFilters
        filters={filters}
        onChange={setFilters}
        resultCount={chefs.length}
      />

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-forest-950 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button
              onClick={() => setFilters({ ...filters })}
              className="mt-3 text-sm font-medium text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : chefs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-forest-100 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-6 w-6 text-forest-400" />
            </div>
            <h3 className="text-lg font-bold text-forest-950 mb-1">
              No chefs match your filters
            </h3>
            <p className="text-sm text-forest-500 mb-6 max-w-sm mx-auto">
              Try broadening your search, or request a chef and we&apos;ll match
              you with someone available.
            </p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-950 text-white text-sm font-medium hover:bg-forest-800 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {chefs.map((chef) => (
              <ChefCard
                key={chef.id}
                chef={chef}
                isFavorite={favorites.has(chef.id)}
                onToggleFavorite={(e) => toggleFavorite(chef, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
