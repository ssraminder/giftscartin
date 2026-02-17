import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ShoppingBag,
  Users,
  MapPin,
  IndianRupee,
  AlertCircle,
} from "lucide-react"

const metrics = [
  {
    title: "Total Orders",
    value: "0",
    icon: ShoppingBag,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Active Vendors",
    value: "0",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    title: "Cities Live",
    value: "0",
    icon: MapPin,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Today's GMV",
    value: "\u20B90",
    icon: IndianRupee,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Phase 3 banner */}
      <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-slate-600" />
          <div>
            <h3 className="font-semibold text-slate-800">
              Full admin panel coming in Phase 3
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Vendor management, order oversight, product catalog, city
              configuration, analytics, and audit logs will be available soon.
            </p>
          </div>
        </div>
      </div>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Platform overview and management</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {metric.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${metric.bg}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {metric.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-slate-600">Database</span>
              <span className="text-sm font-medium text-emerald-600">Connected</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-slate-600">Payment Gateway</span>
              <span className="text-sm font-medium text-slate-400">Not configured</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-slate-600">SMS Gateway</span>
              <span className="text-sm font-medium text-slate-400">Not configured</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-slate-600">Storage</span>
              <span className="text-sm font-medium text-slate-400">Not configured</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
