import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { CityGate } from "@/components/location/city-gate"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { ReferralProvider } from "@/components/providers/referral-provider"
import { prisma } from "@/lib/prisma"

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let logoUrl: string | null = null
  let serializedMenu: Array<{
    id: string
    label: string
    slug: string | null
    href: string | null
    icon: string | null
    isVisible: boolean
    itemType: string
    sortOrder: number
    children: Array<{
      id: string
      label: string
      slug: string | null
      href: string | null
      icon: string | null
      isVisible: boolean
      itemType: string
      sortOrder: number
      children: Array<{
        id: string
        label: string
        slug: string | null
        href: string | null
        icon: string | null
        isVisible: boolean
        itemType: string
        sortOrder: number
        children: never[]
      }>
    }>
  }> = []

  try {
    const [logoSetting, menuItems] = await Promise.all([
      prisma.platformSetting.findFirst({ where: { key: 'logo_url' } }),
      prisma.menuItem.findMany({
        where: { isVisible: true, parentId: null },
        include: {
          children: {
            where: { isVisible: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              children: {
                where: { isVisible: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    logoUrl = logoSetting?.value || null

    serializedMenu = menuItems.map((item) => ({
      id: item.id,
      label: item.label,
      slug: item.slug,
      href: item.href,
      icon: item.icon,
      isVisible: item.isVisible,
      itemType: item.itemType,
      sortOrder: item.sortOrder,
      children: item.children.map((child) => ({
        id: child.id,
        label: child.label,
        slug: child.slug,
        href: child.href,
        icon: child.icon,
        isVisible: child.isVisible,
        itemType: child.itemType,
        sortOrder: child.sortOrder,
        children: child.children.map((grandchild) => ({
          id: grandchild.id,
          label: grandchild.label,
          slug: grandchild.slug,
          href: grandchild.href,
          icon: grandchild.icon,
          isVisible: grandchild.isVisible,
          itemType: grandchild.itemType,
          sortOrder: grandchild.sortOrder,
          children: [] as never[],
        })),
      })),
    }))
  } catch {
    // Fall back to defaults on DB error
  }

  return (
    <ReferralProvider>
      <div className="flex min-h-screen flex-col">
        {/* Announcement bar scrolls away with page */}
        <AnnouncementBar />
        {/* Header is sticky */}
        <div className="sticky top-0 z-50">
          <Header logoUrl={logoUrl} menuItems={serializedMenu} />
        </div>
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav />
        <CityGate />
      </div>
    </ReferralProvider>
  )
}
