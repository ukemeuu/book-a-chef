"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, Heart, BadgeCheck, Phone } from "lucide-react";
import {
  MarketplaceChef,
  chefCover,
  chefTelUrl,
  formatPhone,
} from "@/utils/marketplace";

interface ChefCardProps {
  chef: MarketplaceChef;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

/**
 * Airbnb-style chef card for the directory grid.
 *
 * The card links to the public profile. The heart button is a sibling overlay
 * that stops propagation so favouriting never navigates. The phone number is
 * shown so customers can reach the chef directly from the grid.
 */
export default function ChefCard({
  chef,
  isFavorite,
  onToggleFavorite,
}: ChefCardProps) {
  const cover = chefCover(chef);
  const telUrl = chefTelUrl(chef.phone);

  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-950 focus-visible:ring-offset-2 rounded-2xl"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-forest-950">
        <Image
          src={cover}
          alt={chef.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-forest-950/40 via-transparent to-transparent"
          aria-hidden="true"
        />

        {chef.verified && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-forest-900 text-[10px] font-bold shadow-sm">
            <BadgeCheck className="h-3 w-3 text-emerald-600" />
            Verified
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
          {chef.phone && telUrl ? (
            <a
              href={telUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold text-forest-950 flex items-center gap-1 shrink-0 hover:text-forest-700 transition-colors"
              aria-label={`Call ${chef.name}`}
            >
              <Phone className="h-3 w-3" />
              {formatPhone(chef.phone)}
            </a>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
