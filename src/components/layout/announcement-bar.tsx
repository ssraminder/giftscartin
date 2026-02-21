"use client"

const MESSAGES = [
  "\u{1F389} Free Delivery on orders above \u20B9499",
  "\u26A1 Same Day Delivery \u2014 Order before 4 PM",
  "\u{1F319} Midnight Delivery available in Chandigarh",
  "\u{1F69A} Now delivering across Chandigarh, Mohali & Panchkula",
]

export function AnnouncementBar() {
  return (
    <div className="w-full h-9 overflow-hidden" style={{ background: "linear-gradient(90deg, #E91E63, #C2185B)" }}>
      <div className="flex items-center h-full whitespace-nowrap animate-marquee">
        {/* Duplicate messages to create seamless loop */}
        {[...MESSAGES, ...MESSAGES].map((msg, i) => (
          <span
            key={i}
            className="inline-block px-12 text-white font-medium"
            style={{ fontSize: "13px" }}
          >
            {msg}
          </span>
        ))}
      </div>
    </div>
  )
}
