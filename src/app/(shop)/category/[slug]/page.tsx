import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCategoryMeta } from '@/lib/seo'
import { Breadcrumb } from '@/components/seo/breadcrumb'
import { CategoryProductGrid } from '@/components/category/category-product-grid'
import { Sparkles } from 'lucide-react'

// Cache page for 1 hour, then regenerate on next request
export const revalidate = 3600

// Pre-build all active category pages at deploy time
export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    })
    return categories.map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

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

async function getCategoryBySlug(slug: string) {
  // First try to find as a parent category
  const parent = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
      parent: true,
    },
  })

  if (parent) return parent

  // If not found, could be that slug doesn't exist or is inactive
  return null
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const category = await getCategoryBySlug(params.slug)

  if (!category) {
    notFound()
  }

  const isSubCategory = !!category.parentId
  const parentCategory = category.parent

  // Build breadcrumb items
  const breadcrumbItems = isSubCategory && parentCategory
    ? [
        { label: parentCategory.name, href: `/category/${parentCategory.slug}` },
        { label: category.name },
      ]
    : [{ label: category.name }]

  return (
    <div className="min-h-screen">
      {/* Category Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#E91E63]/10 via-pink-50 to-[#9C27B0]/10">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E91E63' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="container mx-auto px-4 py-8 sm:py-12 relative">
          <div className="mb-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm">
              <Sparkles className="h-6 w-6 text-[#E91E63]" />
            </div>
            <div>
              <h1 className="section-title text-[#1A1A2E]">{category.name}</h1>
              {category.description && (
                <p className="mt-3 text-sm sm:text-base text-[#1A1A2E]/60 max-w-xl">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid with Filters */}
      <CategoryProductGrid
        categorySlug={params.slug}
        categoryName={category.name}
        parentSlug={parentCategory?.slug}
        parentName={parentCategory?.name}
        subcategories={(category.children || []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }))}
        isSubCategory={isSubCategory}
      />
    </div>
  )
}
