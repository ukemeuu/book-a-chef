"use client";

import { Star, BadgeCheck } from "lucide-react";
import { MarketplaceReview, timeAgo } from "@/utils/marketplace";

interface ReviewCardProps {
  review: MarketplaceReview;
}

/**
 * A single verified review on a chef's public profile.
 */
export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-forest-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center text-sm font-bold text-forest-700">
            {review.client_name?.charAt(0)?.toUpperCase() || "G"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-forest-950">
                {review.client_name}
              </p>
              <BadgeCheck className="h-3.5 w-3.5 text-forest-600" />
            </div>
            <p className="text-[11px] text-forest-400">
              {timeAgo(review.created_at)}
              {review.occasion ? ` • ${review.occasion}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= review.rating
                  ? "fill-champagne-400 text-champagne-400"
                  : "text-forest-200"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-forest-700 leading-relaxed">
        {review.comment}
      </p>
    </div>
  );
}
