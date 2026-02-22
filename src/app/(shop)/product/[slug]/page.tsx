import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from '@/components/product/product-detail-client'
import ProductNotFound from './product-not-found'

// ISR: generate on first request, cache for 1 hour, then regenerate in background.
// No generateStaticParams — avoids build-time DB connection pool exhaustion
// when Next.js tries to prerender all ~25 product pages concurrently.
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
  // Step 1: Fetch product with basic fields (needed for ID to fan out parallel queries)
  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDesc: true,
      basePrice: true,
      images: true,
      tags: true,
      occasion: true,
      weight: true,
      isVeg: true,
      isSameDayEligible: true,
      productType: true,
      avgRating: true,
      totalReviews: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!product) {
    return <ProductNotFound />
  }

  // Step 2: Fetch ALL related data IN PARALLEL — single round of concurrent queries
  const [attributes, variations, addonGroups, upsellRows, reviews, vendorProducts, relatedProducts] = await Promise.all([
    prisma.productAttribute.findMany({
      where: { productId: product.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.productVariation.findMany({
      where: { productId: product.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.productAddonGroup.findMany({
      where: { productId: product.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.productUpsell.findMany({
      where: { productId: product.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        upsellProduct: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            basePrice: true,
            isActive: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { productId: product.id, isVerified: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true } },
      },
    }),
    prisma.vendorProduct.findMany({
      where: {
        productId: product.id,
        isAvailable: true,
        vendor: { status: 'APPROVED' },
      },
      select: {
        sellingPrice: true,
        preparationTime: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
            city: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    // Related products from same category
    product.category
      ? prisma.product.findMany({
          where: {
            categoryId: product.category.id,
            isActive: true,
            id: { not: product.id },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            images: true,
            avgRating: true,
            totalReviews: true,
            weight: true,
            tags: true,
          },
          orderBy: { avgRating: 'desc' },
          take: 4,
        })
      : Promise.resolve([]),
  ])

  // Flatten upsells to only active products
  const upsells = upsellRows
    .filter((u) => u.upsellProduct.isActive)
    .map((u) => ({
      id: u.upsellProduct.id,
      name: u.upsellProduct.name,
      slug: u.upsellProduct.slug,
      images: u.upsellProduct.images,
      basePrice: u.upsellProduct.basePrice,
      category: u.upsellProduct.category,
    }))

  // Serialize Prisma output for client component (Decimal → string, Date → ISO string)
  const productData = JSON.parse(JSON.stringify({
    ...product,
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
