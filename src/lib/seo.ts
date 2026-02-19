import { prisma } from './prisma'

const SITE_NAME = 'Gifts Cart India'
const SITE_URL = process.env.NEXTAUTH_URL || 'https://giftscart.netlify.app'
const DEFAULT_DESCRIPTION =
  'Fresh cakes, flowers and gifts delivered same day across India'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`

export interface SeoMeta {
  title: string
  description: string
  keywords: string[]
  ogImage?: string
  canonical?: string
}

export function buildTitle(pageTitle: string) {
  return `${pageTitle} | ${SITE_NAME}`
}

export async function getSeoSettings() {
  return prisma.seoSettings.findFirst()
}

// -- Product ---------------------------------------------------------------

export async function getProductMeta(slug: string): Promise<SeoMeta | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true, shortDesc: true, basePrice: true,
      metaTitle: true, metaDescription: true, metaKeywords: true,
      ogImage: true, canonicalUrl: true, images: true,
      category: { select: { name: true } },
    },
  })
  if (!product) return null

  const price = Number(product.basePrice)
  return {
    title: product.metaTitle ||
      `${product.name} - Order Online | ${SITE_NAME}`,
    description: product.metaDescription || product.shortDesc ||
      `Order ${product.name} online. Fresh ${product.category.name.toLowerCase()} ` +
      `delivered same day in Chandigarh and Tricity. Starting ₹${price}.`,
    keywords: product.metaKeywords.length
      ? product.metaKeywords
      : [product.name, product.category.name, 'order online', 'same day delivery', 'Chandigarh'],
    ogImage: product.ogImage || product.images[0] || DEFAULT_OG_IMAGE,
    canonical: product.canonicalUrl || `${SITE_URL}/product/${slug}`,
  }
}

// -- Category --------------------------------------------------------------

export async function getCategoryMeta(slug: string): Promise<SeoMeta | null> {
  const cat = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true, description: true,
      metaTitle: true, metaDescription: true,
      metaKeywords: true, ogImage: true,
    },
  })
  if (!cat) return null

  return {
    title: cat.metaTitle || `${cat.name} - Order Online | ${SITE_NAME}`,
    description: cat.metaDescription || cat.description ||
      `Order fresh ${cat.name.toLowerCase()} online. Same day delivery in Chandigarh, Mohali and Panchkula.`,
    keywords: cat.metaKeywords.length
      ? cat.metaKeywords
      : [cat.name, 'order online', 'same day delivery', 'Chandigarh'],
    ogImage: cat.ogImage || DEFAULT_OG_IMAGE,
    canonical: `${SITE_URL}/category/${slug}`,
  }
}

// -- JSON-LD builders ------------------------------------------------------

export function buildProductJsonLd(product: {
  name: string; description?: string | null; images: string[]
  basePrice: number; avgRating: number; totalReviews: number; slug: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.basePrice,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/product/${product.slug}`,
    },
    ...(product.totalReviews > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.avgRating,
        reviewCount: product.totalReviews,
      },
    }),
  }
}

export function buildBreadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', areaServed: 'IN' },
  }
}

export function buildLocalBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, Credit Card, UPI',
    areaServed: ['Chandigarh', 'Mohali', 'Panchkula'],
  }
}
