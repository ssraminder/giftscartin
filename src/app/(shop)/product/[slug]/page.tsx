import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { getSupabaseAdmin } from '@/lib/supabase'
import ProductDetailContent from '@/components/product/product-detail-content'
import ProductNotFound from './product-not-found'

// ISR: generate on first request, cache for 1 hour, then regenerate in background.
export const revalidate = 3600

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const meta = await getProductMeta(params.slug)
  if (!meta) return { title: 'Product Not Found | Gifts Cart India' }
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: meta.ogImage ? [meta.ogImage] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: meta.ogImage ? [meta.ogImage] : [],
    },
    alternates: meta.canonical ? { canonical: meta.canonical } : undefined,
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = getSupabaseAdmin()

  // Step 1: Fetch product with category
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, "shortDesc", "basePrice", images, tags, occasion,
      weight, "isVeg", "isSameDayEligible", "isExpressEligible", "productType",
      "avgRating", "totalReviews", "categoryId",
      "minLeadTimeHours", "leadTimeNote", instructions, "deliveryInfo", "productDetails",
      categories(id, name, slug)
    `)
    .eq('slug', params.slug)
    .eq('isActive', true)
    .single()

  if (!product) {
    return <ProductNotFound />
  }

  // Step 2: Fetch variations, addon groups, upsell IDs, and reviews IN PARALLEL
  const [
    variationsRes,
    addonGroupsRes,
    upsellRecordsRes,
    reviewsRes,
  ] = await Promise.all([
    supabase
      .from('product_variations')
      .select('*')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true }),
    supabase
      .from('product_addon_groups')
      .select('*, product_addon_options(*)')
      .eq('productId', product.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true }),
    // Two-step upsell fetch: first get upsell record IDs (avoids FK hint issues)
    supabase
      .from('product_upsells')
      .select('id, "productId", "upsellProductId", "sortOrder"')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true }),
    supabase
      .from('reviews')
      .select('*, users(name)')
      .eq('productId', product.id)
      .eq('isVerified', true)
      .order('createdAt', { ascending: false })
      .limit(20),
  ])

  if (variationsRes.error) console.error('[product] variations error:', variationsRes.error.message)
  if (addonGroupsRes.error) console.error('[product] addonGroups error:', addonGroupsRes.error.message)
  if (upsellRecordsRes.error) console.error('[product] upsellRecords error:', upsellRecordsRes.error.message)
  if (reviewsRes.error) console.error('[product] reviews error:', reviewsRes.error.message)

  const variations = variationsRes.data || []

  const addonGroups = (addonGroupsRes.data || []).map((group: Record<string, unknown>) => ({
    ...group,
    product_addon_options: undefined,
    options: ((group.product_addon_options as Array<Record<string, unknown>>) || [])
      .filter((o) => o.isActive !== false)
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)),
  }))

  // Step 3: Fetch upsell products by ID (two-step approach — reliable across column-naming conventions)
  let upsells: Array<{
    id: string
    name: string
    slug: string
    images: string[]
    basePrice: number
    category: { name: string } | null
  }> = []

  const upsellRecords = upsellRecordsRes.data || []
  if (upsellRecords.length > 0) {
    const upsellIds = upsellRecords.map((u: Record<string, unknown>) => u.upsellProductId as string)
    const { data: upsellProducts, error: upsellProductsError } = await supabase
      .from('products')
      .select('id, name, slug, images, "basePrice", "isActive", categories(name)')
      .in('id', upsellIds)
      .eq('isActive', true)

    if (upsellProductsError) console.error('[product] upsellProducts error:', upsellProductsError.message)

    // Maintain sort order from upsell records
    const upsellMap = new Map(
      (upsellProducts || []).map((p: Record<string, unknown>) => [p.id as string, p])
    )

    upsells = upsellRecords
      .map((u: Record<string, unknown>) => upsellMap.get(u.upsellProductId as string))
      .filter((p: unknown): p is Record<string, unknown> => !!p)
      .map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        images: (p.images as string[]) || [],
        basePrice: p.basePrice as number,
        category: p.categories as { name: string } | null,
      }))
  }

  const reviews = (reviewsRes.data || []).map((r: Record<string, unknown>) => ({
    ...r,
    user: (r.users as Record<string, unknown>) || null,
    users: undefined,
  }))

  // Build the category object in the expected format
  const category = product.categories as unknown as { id: string; name: string; slug: string } | null

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://giftscart.netlify.app'
  const breadcrumbCrumbs = [
    { name: 'Home', url: SITE_URL },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/category/${category.slug}` }] : []),
    { name: product.name, url: `${SITE_URL}/product/${params.slug}` },
  ]

  // Serialize for client component (Decimal → string, Date → ISO string)
  const serialized = JSON.parse(JSON.stringify({
    product: {
      ...product,
      category,
    },
    variations,
    addonGroups,
    upsells,
    reviews,
  }))

  return (
    <>
      <JsonLd
        data={buildProductJsonLd({
          name: product.name,
          description: product.description,
          images: product.images,
          basePrice: Number(product.basePrice),
          avgRating: Number(product.avgRating),
          totalReviews: product.totalReviews,
          slug: params.slug,
        })}
      />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbCrumbs)} />
      <ProductDetailContent
        product={serialized.product}
        variations={serialized.variations}
        addonGroups={serialized.addonGroups}
        upsells={serialized.upsells}
        reviews={serialized.reviews}
        category={category}
      />
    </>
  )
}
