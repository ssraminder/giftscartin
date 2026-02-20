"use client"

import Link from "next/link"
import { CreditCard, DollarSign, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const settingsLinks = [
  {
    href: "/admin/settings/currencies",
    icon: DollarSign,
    label: "Currency Settings",
    description: "Configure currencies, exchange rates, markup, and rounding rules for international visitors",
  },
  {
    href: "/admin/settings/payment-methods",
    icon: CreditCard,
    label: "Payment Methods",
    description: "Configure available payment methods for manual payment recording (Cash, UPI, Bank Transfer, etc.)",
  },
]

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configure platform settings</p>
      </div>

      <div className="space-y-3">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <link.icon className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{link.label}</p>
                  <p className="text-sm text-slate-500">{link.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
