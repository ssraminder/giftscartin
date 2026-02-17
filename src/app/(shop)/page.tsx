import { HeroBanner } from "@/components/home/hero-banner"
import { CategoryGrid } from "@/components/home/category-grid"
import { OccasionNav } from "@/components/home/occasion-nav"
import { TrendingProducts } from "@/components/home/trending-products"
import { Testimonials } from "@/components/home/testimonials"
import { CityBanner } from "@/components/home/city-banner"

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <CategoryGrid />
      <OccasionNav />
      <TrendingProducts />
      <Testimonials />
      <CityBanner />
    </>
  )
}
