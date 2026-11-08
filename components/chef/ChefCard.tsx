"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Heart, BadgeCheck } from "lucide-react";
import { MarketplaceChef, formatPrice } from "@/utils/marketplace";

interface ChefCardProps {
  chef: MarketplaceChef;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

/**
 * Airbnb-style chef card for the marketplace grid.
 *
 * The card links to the public profile. The heart button is a sibling overlay
 * that stops propagation so favouriting never navigates.
 */
export default function ChefCard({
  chef,
  isFavorite,
  onToggleFavorite,
}: ChefCardProps) {
  const cover = chef.cover_image_url || chef.avatar_url;

  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 rounded-2xl"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-cream-100">
        <Image
          src={cover}
          alt={chef.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-forest-950/35 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Availability */}
        {chef.is_available && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Available
          </span>
        )}

        {/* Favorite */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "Remove from favourites" : "Save to favourites"}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-forest-600"
              }`}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-forest-950 truncate">
                {chef.name}
              </h3>
              {chef.verified && (
                <BadgeCheck className="h-4 w-4 text-forest-600 shrink-0" />
              )}
            </div>
            {chef.brand_name && (
              <p className="text-xs text-forest-500 truncate">
                {chef.brand_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-3.5 w-3.5 text-champagne-500 fill-current" />
            <span className="text-sm font-semibold text-forest-950">
              {Number(chef.rating || 0).toFixed(1)}
            </span>
            {chef.reviews_count > 0 && (
              <span className="text-xs text-forest-400">
                ({chef.reviews_count})
              </span>
            )}
          </div>
        </div>

        {/* Cuisines */}
        {chef.cuisines?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {chef.cuisines.slice(0, 3).map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-full bg-cream-100 text-forest-700 text-[10px] font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-forest-500 flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{chef.city}</span>
          </span>
          <span className="text-sm font-bold text-forest-950 shrink-0">
            {formatPrice(chef.price_per_guest)}
            <span className="text-[10px] font-normal text-forest-400">
              {" "}
              /guest
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
