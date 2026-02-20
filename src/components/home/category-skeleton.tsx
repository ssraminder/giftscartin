import { Skeleton } from '@/components/ui/skeleton'

export function CategoryGridSkeleton() {
  return (
    <section className="py-6 px-4">
      <Skeleton className="h-7 w-40 mb-4" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </section>
  )
}
