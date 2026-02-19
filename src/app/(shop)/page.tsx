import type { Metadata } from 'next'
import { buildOrganizationJsonLd, buildLocalBusinessJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { HeroBanner } from "@/components/home/hero-banner"
import { CategoryGrid } from "@/components/home/category-grid"
import { OccasionNav } from "@/components/home/occasion-nav"
import { TrendingProducts } from "@/components/home/trending-products"
import { Testimonials } from "@/components/home/testimonials"
import { CityBanner } from "@/components/home/city-banner"

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
      <HeroBanner />
      <CategoryGrid />
      <OccasionNav />
      <TrendingProducts />
      <Testimonials />
      <CityBanner />
    </>
  )
}
