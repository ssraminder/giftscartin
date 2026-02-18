"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ArrowLeft,
  Check,
  DollarSign,
  Edit2,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CurrencyConfig {
  id: string
  code: string
  name: string
  symbol: string
  symbolPosition: string
  exchangeRate: number
  markup: number
  rounding: string
  roundTo: number
  locale: string
  countries: string[]
  isDefault: boolean
  isActive: boolean
}

const EMPTY_FORM: Omit<CurrencyConfig, "id"> = {
  code: "",
  name: "",
  symbol: "",
  symbolPosition: "before",
  exchangeRate: 1,
  markup: 0,
  rounding: "nearest",
  roundTo: 0.01,
  locale: "en-US",
  countries: [],
  isDefault: false,
  isActive: true,
}

export default function CurrenciesSettingsPage() {
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Omit<CurrencyConfig, "id">>(EMPTY_FORM)
  const [countriesInput, setCountriesInput] = useState("")
  const [error, setError] = useState("")

  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/currencies")
      const json = await res.json()
      if (json.success) {
        setCurrencies(json.data)
      }
    } catch {
      console.error("Failed to fetch currencies")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies])

  const startEdit = (currency: CurrencyConfig) => {
    setEditingId(currency.id)
    setShowCreate(false)
    setForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      symbolPosition: currency.symbolPosition,
      exchangeRate: currency.exchangeRate,
      markup: currency.markup,
      rounding: currency.rounding,
      roundTo: currency.roundTo,
      locale: currency.locale,
      countries: currency.countries,
      isDefault: currency.isDefault,
      isActive: currency.isActive,
    })
    setCountriesInput(currency.countries.join(", "))
    setError("")
  }

  const startCreate = () => {
    setEditingId(null)
    setShowCreate(true)
    setForm(EMPTY_FORM)
    setCountriesInput("")
    setError("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowCreate(false)
    setError("")
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)

    const countries = countriesInput
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)

    const payload = { ...form, countries }

    try {
      let res: Response
      if (editingId) {
        res = await fetch("/api/admin/currencies", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingId }),
        })
      } else {
        res = await fetch("/api/admin/currencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (json.success) {
        cancelEdit()
        fetchCurrencies()
      } else {
        setError(json.error || "Failed to save")
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this currency?")) return

    try {
      const res = await fetch(`/api/admin/currencies?id=${id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        fetchCurrencies()
      } else {
        alert(json.error || "Failed to delete")
      }
    } catch {
      alert("Network error")
    }
  }

  const previewPrice = (inrAmount: number) => {
    const converted = inrAmount * form.exchangeRate
    const withMarkup = converted * (1 + form.markup / 100)
    let rounded = withMarkup
    if (form.rounding !== "none" && form.roundTo > 0) {
      const factor = 1 / form.roundTo
      if (form.rounding === "up") rounded = Math.ceil(withMarkup * factor) / factor
      else if (form.rounding === "down") rounded = Math.floor(withMarkup * factor) / factor
      else rounded = Math.round(withMarkup * factor) / factor
    }
    try {
      return new Intl.NumberFormat(form.locale || "en-US", {
        style: "currency",
        currency: form.code || "USD",
        minimumFractionDigits: form.roundTo >= 1 ? 0 : 2,
      }).format(rounded)
    } catch {
      return `${form.symbol}${rounded.toFixed(2)}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Currency Settings</h1>
            <p className="text-sm text-slate-500">
              Configure currencies, exchange rates, markup, and rounding rules
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCurrencies}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Currency
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? `Edit ${form.code}` : "Add New Currency"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Currency Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={5}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="US Dollar"
                />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
              <div>
                <Label>Symbol Position</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.symbolPosition}
                  onChange={(e) => setForm({ ...form, symbolPosition: e.target.value })}
                >
                  <option value="before">Before (e.g. $10)</option>
                  <option value="after">After (e.g. 10€)</option>
                </select>
              </div>
              <div>
                <Label>Exchange Rate (per 1 INR)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.exchangeRate}
                  onChange={(e) => setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Markup %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.markup}
                  onChange={(e) => setForm({ ...form, markup: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Rounding</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.rounding}
                  onChange={(e) => setForm({ ...form, rounding: e.target.value })}
                >
                  <option value="nearest">Nearest</option>
                  <option value="up">Round Up</option>
                  <option value="down">Round Down</option>
                  <option value="none">No Rounding</option>
                </select>
              </div>
              <div>
                <Label>Round To</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.roundTo}
                  onChange={(e) => setForm({ ...form, roundTo: parseFloat(e.target.value) || 0.01 })}
                />
                <p className="text-xs text-slate-400 mt-1">e.g. 0.01, 0.99, 1</p>
              </div>
              <div>
                <Label>Locale</Label>
                <Input
                  value={form.locale}
                  onChange={(e) => setForm({ ...form, locale: e.target.value })}
                  placeholder="en-US"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>Country Codes (comma-separated ISO 2-letter)</Label>
                <Input
                  value={countriesInput}
                  onChange={(e) => setCountriesInput(e.target.value)}
                  placeholder="US, CA, AU, NZ"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Visitors from these countries will see prices in this currency
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Default Currency
                </label>
              </div>
            </div>

            {/* Live Preview */}
            {form.code && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Price Preview (for a product priced at ₹599 INR)</p>
                <p className="text-lg font-bold text-slate-900">
                  {previewPrice(599)}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Save Changes" : "Create Currency"}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currency List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : currencies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No currencies configured yet</p>
            <Button size="sm" className="mt-4" onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Currency
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {currencies.map((currency) => (
            <Card key={currency.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold">
                      {currency.symbol}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{currency.code}</span>
                        <span className="text-sm text-slate-500">{currency.name}</span>
                        {currency.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        {!currency.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        <span>Rate: 1 INR = {currency.exchangeRate} {currency.code}</span>
                        <span>Markup: {currency.markup}%</span>
                        <span>Rounding: {currency.rounding} to {currency.roundTo}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currency.countries.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            <Globe className="mr-0.5 h-2.5 w-2.5" />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(currency)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!currency.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(currency.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="py-4">
          <h3 className="font-medium text-blue-900">How Currency Resolution Works</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>Visitors are geo-located via IP (Cloudflare/Vercel headers)</li>
            <li>Their country code is matched against the configured country lists</li>
            <li>If no match is found, the default currency (INR) is used</li>
            <li>Prices are converted from INR using: (INR price x exchange rate) x (1 + markup%)</li>
            <li>The result is then rounded according to the rounding rule</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
