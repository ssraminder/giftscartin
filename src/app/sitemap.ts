import { MetadataRoute } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://giftscart.netlify.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin()

  const [productsRes, categoriesRes, citiesRes] = await Promise.all([
    supabase.from('products').select('slug, updatedAt').eq('isActive', true),
    supabase.from('categories').select('slug').eq('isActive', true),
    supabase.from('cities').select('slug').eq('isActive', true),
  ])

  const products = productsRes.data || []
  const categories = categoriesRes.data || []
  const cities = citiesRes.data || []

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    ...categories.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...cities.map((c) => ({
      url: `${SITE_URL}/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
