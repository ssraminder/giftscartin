import type { Metadata } from 'next'
import { buildOrganizationJsonLd, buildLocalBusinessJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { HeroBanner } from "@/components/home/hero-banner"
import { OccasionPills } from "@/components/home/occasion-pills"
import { TrendingProducts } from "@/components/home/trending-products"
import { CategoryGrid } from "@/components/home/category-grid"
import { OccasionProductRow } from "@/components/home/occasion-product-row"
import { TrustStrip } from "@/components/home/trust-strip"
import { Testimonials } from "@/components/home/testimonials"
import { CityBanner } from "@/components/home/city-banner"
import { SeoTextBlock } from "@/components/home/seo-text-block"

export const metadata: Metadata = {
  title: 'Gifts Cart India — Same Day Cake, Flower & Gift Delivery',
  description:
    'Order fresh cakes, flowers and gifts online. Same day delivery in Chandigarh, Mohali and Panchkula. Midnight delivery available.',
  openGraph: {
    title: 'Gifts Cart India — Same Day Delivery',
    description: 'Fresh cakes, flowers and gifts delivered same day.',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildLocalBusinessJsonLd()} />

      {/* 1. Hero Banner (carousel) */}
      <HeroBanner />

      {/* 2. Occasion Pills */}
      <OccasionPills />

      {/* 3. Best Sellers Row */}
      <TrendingProducts />

      {/* 4. Category Showcase */}
      <CategoryGrid />

      {/* 5. Gifts by Occasion — one row per occasion */}
      <OccasionProductRow
        occasion="birthday"
        title="🎂 Birthday Gifts"
        linkUrl="/category/gifts?occasion=birthday"
      />
      <OccasionProductRow
        occasion="anniversary"
        title="💍 Anniversary Gifts"
        linkUrl="/category/gifts?occasion=anniversary"
      />
      <OccasionProductRow
        occasion="valentines-day"
        title="💝 Valentine's Gifts"
        linkUrl="/category/gifts?occasion=valentines-day"
      />

      {/* 6. Trust Strip */}
      <TrustStrip />

      {/* 7. Customer Reviews */}
      <Testimonials />

      {/* 8. Cities Banner */}
      <CityBanner />

      {/* 9. SEO Text Block */}
      <SeoTextBlock />
    </>
  )
}
