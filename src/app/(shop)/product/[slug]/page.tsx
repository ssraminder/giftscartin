import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd } from '@/lib/seo'
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

  // Step 2: Fetch ALL related data IN PARALLEL
  const [
    variationsRes,
    addonGroupsRes,
    upsellRowsRes,
    reviewsRes,
  ] = await Promise.all([
    supabase
      .from('product_variations')
      .select('*')
      .eq('productId', product.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true }),
    supabase
      .from('product_addon_groups')
      .select('*, product_addon_options(*)')
      .eq('productId', product.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true }),
    supabase
      .from('product_upsells')
      .select('*, products!upsellProductId(id, name, slug, images, basePrice, isActive, categories(name))')
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

  const variations = variationsRes.data || []

  const addonGroups = (addonGroupsRes.data || []).map((group: Record<string, unknown>) => ({
    ...group,
    options: ((group.product_addon_options as Array<{ isActive: boolean; sortOrder: number }>) || [])
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }))

  // Flatten upsells to only active products
  const upsellRows = upsellRowsRes.data || []
  const upsells = upsellRows
    .filter((u: { products: { isActive: boolean } | null }) => u.products?.isActive)
    .map((u: { products: { id: string; name: string; slug: string; images: string[]; basePrice: number; categories: { name: string } | null } }) => ({
      id: u.products.id,
      name: u.products.name,
      slug: u.products.slug,
      images: u.products.images,
      basePrice: u.products.basePrice,
      category: u.products.categories,
    }))

  const reviews = (reviewsRes.data || []).map((r: Record<string, unknown>) => ({
    ...r,
    user: (r.users as Record<string, unknown>) || null,
  }))

  // Build the category object in the expected format
  const category = product.categories as unknown as { id: string; name: string; slug: string } | null

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
