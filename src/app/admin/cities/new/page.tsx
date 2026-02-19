import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CityForm } from "@/components/admin/city-form"

export default function NewCityPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/cities"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cities
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add City</h1>
      </div>
      <CityForm />
    </div>
  )
}
