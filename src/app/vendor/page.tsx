import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  IndianRupee,
  Star,
  AlertCircle,
} from "lucide-react"

const metrics = [
  {
    title: "Today's Orders",
    value: "0",
    icon: ShoppingBag,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    title: "This Week's Earnings",
    value: "\u20B90",
    icon: IndianRupee,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Rating",
    value: "\u2014",
    icon: Star,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Status",
    value: "Setup Pending",
    icon: AlertCircle,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
]

export default function VendorDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Phase 3 banner */}
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-teal-600" />
          <div>
            <h3 className="font-semibold text-teal-800">
              Full vendor dashboard coming in Phase 3
            </h3>
            <p className="mt-1 text-sm text-teal-700">
              Order management, product catalog editing, earnings tracking, and
              real-time notifications will be available soon.
            </p>
          </div>
        </div>
      </div>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome to your vendor dashboard
        </p>
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

      {/* Quick info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                1
              </Badge>
              Complete your store profile and business details
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                2
              </Badge>
              Add your products and set pricing
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                3
              </Badge>
              Configure delivery zones and time slots
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                4
              </Badge>
              Go online and start receiving orders
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
