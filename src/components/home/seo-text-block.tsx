"use client"

import { useState } from "react"

export function SeoTextBlock() {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Online Gift Delivery in India — Gifts Cart India
          </h2>
          <div
            className={`text-sm text-gray-600 leading-relaxed space-y-3 ${
              !expanded ? "line-clamp-3 md:line-clamp-none" : ""
            }`}
          >
            <p>
              Gifts Cart India is your one-stop destination for sending fresh cakes, beautiful
              flowers, and thoughtful gifts to your loved ones across India. Whether it&apos;s a
              birthday celebration, wedding anniversary, or a festive occasion like Diwali or
              Raksha Bandhan, we connect you with the best local vendors to deliver happiness
              right to their doorstep.
            </p>
            <p>
              We offer same-day delivery, midnight delivery, and fixed time-slot delivery so
              you never miss a special moment. Our curated collection includes designer cakes,
              photo cakes, eggless cakes, fresh flower bouquets, indoor plants, personalized
              gifts, chocolates, dry fruit hampers, and more.
            </p>
            <p>
              Currently delivering in Chandigarh, Mohali, and Panchkula, we are rapidly
              expanding to more cities across India. Every product is freshly prepared by
              verified local vendors and delivered with care to ensure the highest quality.
              With secure payments via Razorpay, easy ordering, and dedicated customer support,
              Gifts Cart India makes online gifting simple, reliable, and delightful.
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm font-medium text-pink-600 hover:text-pink-700 md:hidden"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>
      </div>
    </section>
  )
}
