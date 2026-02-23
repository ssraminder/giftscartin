import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AnnouncementBar } from "@/components/layout/announcement-bar"
import { ReferralProvider } from "@/components/providers/referral-provider"
import { getSupabaseAdmin } from "@/lib/supabase"

interface MenuNode {
  id: string
  label: string
  slug: string | null
  href: string | null
  icon: string | null
  isVisible: boolean
  itemType: string
  sortOrder: number
  children: MenuNode[]
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let logoUrl: string | null = null
  let serializedMenu: MenuNode[] = []

  try {
    const supabase = getSupabaseAdmin()

    const [logoResult, menuResult] = await Promise.all([
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single(),
      supabase
        .from('menu_items')
        .select('id, parentId, label, slug, href, icon, sortOrder, isVisible, itemType')
        .eq('isVisible', true)
        .order('sortOrder', { ascending: true }),
    ])

    logoUrl = logoResult.data?.value || null

    // Build tree from flat list
    const allItems = menuResult.data || []
    const itemMap = new Map<string, MenuNode>()
    const roots: MenuNode[] = []

    for (const item of allItems) {
      itemMap.set(item.id, {
        id: item.id,
        label: item.label,
        slug: item.slug,
        href: item.href,
        icon: item.icon,
        isVisible: item.isVisible,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        children: [],
      })
    }

    for (const item of allItems) {
      const node = itemMap.get(item.id)!
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.children.push(node)
      } else if (!item.parentId) {
        roots.push(node)
      }
    }

    serializedMenu = roots
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
      </div>
    </ReferralProvider>
  )
}
