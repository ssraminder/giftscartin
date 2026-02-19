import type { Metadata } from 'next'
import { getProductMeta, buildProductJsonLd } from '@/lib/seo'
import { JsonLd } from '@/components/seo/json-ld'
import { prisma } from '@/lib/prisma'
import ProductDetailClient from './product-detail-client'

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
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      images: true,
      basePrice: true,
      avgRating: true,
      totalReviews: true,
    },
  })

  return (
    <>
      {product && (
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
      )}
      <ProductDetailClient slug={params.slug} />
    </>
  )
}
