import Link from "next/link"
import { Package } from "lucide-react"

export default function ProductNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF0F5]">
          <Package className="h-10 w-10 text-[#E91E63]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          We couldn&apos;t find the product you&apos;re looking for. It may have been removed or the link might be incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 btn-gradient px-6 py-3 rounded-lg text-sm"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
