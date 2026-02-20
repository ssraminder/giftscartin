import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { CityGate } from "@/components/location/city-gate"

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
      <CityGate />
    </div>
  )
}
