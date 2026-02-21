import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { CityGate } from "@/components/location/city-gate"
import { AnnouncementBar } from "@/components/layout/announcement-bar"

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Announcement bar scrolls away with page */}
      <AnnouncementBar />
      {/* Header is sticky */}
      <div className="sticky top-0 z-50">
        <Header />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
      <CityGate />
    </div>
  )
}
