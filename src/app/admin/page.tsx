'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ShoppingBag,
  IndianRupee,
  Clock,
  RefreshCw,
  MapPin,
  Settings,
  ClipboardList,
  Store,
  Tag,
} from 'lucide-react'

// ==================== Types ====================

interface DashboardData {
  todayQuotes: number
  todayOrders: number
  todayRevenue: number
  hitlPending: number
  recentActivity: {
    id: string
    type: string
    description: string
    time: string
  }[]
}

// ==================== StatCard ====================

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  linkTo,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  linkTo?: string
}) {
  const card = (
    <Card className={linkTo ? 'transition-shadow hover:shadow-md cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  )

  if (linkTo) {
    return <Link href={linkTo}>{card}</Link>
  }
  return card
}

// ==================== QuickActionLink ====================

function QuickActionLink({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50"
    >
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </Link>
  )
}

// ==================== AdminDashboardPage ====================

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const formatRevenue = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="space-y-6">
      {/* Page heading with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Platform overview and management</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards — 3 metrics + HITL Queue (no link) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Quotes"
          value={loading ? '—' : (data?.todayQuotes ?? 0)}
          icon={FileText}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          title="Today's Orders"
          value={loading ? '—' : (data?.todayOrders ?? 0)}
          icon={ShoppingBag}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <StatCard
          title="Today's Revenue"
          value={loading ? '—' : formatRevenue(data?.todayRevenue ?? 0)}
          icon={IndianRupee}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          title="HITL Queue"
          value={loading ? '—' : (data?.hitlPending ?? 0)}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {activity.description}
                      </p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickActionLink
              href="/admin/orders"
              icon={ClipboardList}
              label="View Orders"
              color="bg-blue-500"
            />
            <QuickActionLink
              href="/admin/vendors"
              icon={Store}
              label="Manage Vendors"
              color="bg-violet-500"
            />
            <QuickActionLink
              href="/admin/products"
              icon={Tag}
              label="View Products"
              color="bg-emerald-500"
            />
            <QuickActionLink
              href="/admin/cities"
              icon={MapPin}
              label="Manage Cities"
              color="bg-amber-500"
            />
            <QuickActionLink
              href="/admin/settings"
              icon={Settings}
              label="Settings"
              color="bg-slate-500"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
