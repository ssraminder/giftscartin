import type { Metadata } from 'next'
import { getCategoryMeta } from '@/lib/seo'
import CategoryPageClient from './category-page-client'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const meta = await getCategoryMeta(params.slug)
  if (!meta) return { title: 'Category Not Found | Gifts Cart India' }
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: meta.ogImage ? [meta.ogImage] : [],
    },
    alternates: meta.canonical ? { canonical: meta.canonical } : undefined,
  }
}

export default function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  return <CategoryPageClient slug={params.slug} />
}
