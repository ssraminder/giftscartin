import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from './product-detail-client'
import ProductNotFound from './product-not-found'

// Cache product data for 5 minutes — avoids hitting DB on every request
export const revalidate = 300

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
  // Full product query — replaces client-side fetch to /api/products/[slug]
  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      isActive: true,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      attributes: {
        orderBy: { sortOrder: 'asc' },
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
        },
      },
      variations: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
      addonGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      upsells: {
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
      },
      reviews: {
        where: { isVerified: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true } },
        },
      },
      vendorProducts: {
        where: {
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
      },
    },
  })

  if (!product) {
    return <ProductNotFound />
  }

  // Flatten upsells to only active products
  const upsells = product.upsells
    .filter((u) => u.upsellProduct.isActive)
    .map((u) => ({
      id: u.upsellProduct.id,
      name: u.upsellProduct.name,
      slug: u.upsellProduct.slug,
      images: u.upsellProduct.images,
      basePrice: u.upsellProduct.basePrice,
      category: u.upsellProduct.category,
    }))

  // Fetch related products from same category (in parallel with nothing — ready for future parallel queries)
  const relatedProducts = product.category
    ? await prisma.product.findMany({
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
    : []

  // Serialize Prisma output for client component (Decimal → string, Date → ISO string)
  // The client already handles Number() conversion for display
  const productData = JSON.parse(JSON.stringify({ ...product, upsells }))
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
