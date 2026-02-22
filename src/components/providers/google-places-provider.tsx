'use client'

import Script from 'next/script'

export function GooglePlacesProvider() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&region=IN&language=en`}
      strategy="lazyOnload"
    />
  )
}
