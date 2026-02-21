"use client"

import { Star, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Review } from "@/types"

interface ReviewListProps {
  reviews: Review[]
  avgRating: number
  totalReviews: number
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  )
}

function RatingBreakdown({ reviews, totalReviews }: { reviews: Review[]; totalReviews: number }) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="space-y-1.5">
      {counts.map(({ star, count }) => {
        const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-muted-foreground">{star}</span>
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-right text-muted-foreground">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ReviewList({ reviews, avgRating, totalReviews }: ReviewListProps) {
  return (
    <div className="space-y-6">
      {/* Rating summary */}
      <div className="flex gap-6 rounded-xl border p-4 sm:p-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-bold">{Number(avgRating).toFixed(1)}</span>
          <StarRating rating={Math.round(avgRating)} />
          <span className="mt-1 text-xs text-muted-foreground">
            {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </span>
        </div>
        <div className="flex-1">
          <RatingBreakdown reviews={reviews} totalReviews={totalReviews} />
        </div>
      </div>

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} />
                {review.isVerified && (
                  <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm font-medium">
                  {review.user?.name || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1.5 text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
