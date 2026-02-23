import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { getSupabaseAdmin } from '@/lib/supabase'
import ProductDetailClient from '@/components/product/product-detail-client'
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
    .select('id, name, slug, description, shortDesc, basePrice, images, tags, occasion, weight, isVeg, isSameDayEligible, productType, avgRating, totalReviews, categoryId, categories(id, name, slug)')
    .eq('slug', params.slug)
    .eq('isActive', true)
    .single()

  if (!product) {
    return <ProductNotFound />
  }

  // Step 2: Fetch ALL related data IN PARALLEL
  const [
    attributesRes,
    variationsRes,
    addonGroupsRes,
    upsellRowsRes,
    reviewsRes,
    vendorProductsRes,
    relatedProductsRes,
  ] = await Promise.all([
    supabase
      .from('product_attributes')
      .select('*, product_attribute_options(*)')
      .eq('productId', product.id)
      .order('sortOrder', { ascending: true }),
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
      .limit(10),
    supabase
      .from('vendor_products')
      .select('sellingPrice, preparationTime, vendors(id, businessName, rating, cities(name, slug))')
      .eq('productId', product.id)
      .eq('isAvailable', true),
    product.categories
      ? supabase
          .from('products')
          .select('id, name, slug, basePrice, images, avgRating, totalReviews, weight, tags')
          .eq('categoryId', (product.categories as unknown as { id: string }).id)
          .eq('isActive', true)
          .neq('id', product.id)
          .order('avgRating', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ])

  const attributes = (attributesRes.data || []).map((attr) => ({
    ...attr,
    options: attr.product_attribute_options || [],
  }))

  const variations = variationsRes.data || []

  const addonGroups = (addonGroupsRes.data || []).map((group) => ({
    ...group,
    options: (group.product_addon_options || [])
      .filter((o: { isActive: boolean }) => o.isActive)
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder),
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

  const reviews = (reviewsRes.data || []).map((r) => ({
    ...r,
    user: r.users || null,
  }))

  const vendorProducts = (vendorProductsRes.data || [])
    .filter((vp: Record<string, unknown>) => vp.vendors)
    .map((vp: Record<string, unknown>) => {
      const vendor = vp.vendors as Record<string, unknown>
      return {
        sellingPrice: vp.sellingPrice as number,
        preparationTime: vp.preparationTime as number,
        vendor: {
          id: vendor.id as string,
          businessName: vendor.businessName as string,
          rating: vendor.rating as number,
          city: vendor.cities as { name: string; slug: string } | null,
        },
      }
    })

  const relatedProducts = relatedProductsRes.data || []

  // Build the category object in the expected format
  const category = product.categories as unknown as { id: string; name: string; slug: string } | null

  // Serialize for client component (Decimal → string, Date → ISO string)
  const productData = JSON.parse(JSON.stringify({
    ...product,
    category,
    attributes,
    variations,
    addonGroups,
    upsells,
    reviews,
    vendorProducts,
  }))
  const relatedData = JSON.parse(JSON.stringify(relatedProducts))

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
      <ProductDetailClient
        initialProduct={productData}
        initialRelatedProducts={relatedData}
      />
    </>
  )
}
