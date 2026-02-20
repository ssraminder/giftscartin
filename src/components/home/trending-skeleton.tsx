import { Skeleton } from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/components/product/product-card-skeleton'

export function TrendingSkeleton() {
  return (
    <section className="py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}
