"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Store,
  AlertCircle,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  Calendar,
  MapPin,
  Clock,
  Plus,
  X,
  Loader2,
} from "lucide-react"
import { requiresFssai, GST_REGEX, FSSAI_REGEX } from "@/lib/constants"

interface VendorSettings {
  id: string
  businessName: string
  ownerName: string
  phone: string
  email: string | null
  address: string
  cityId: string
  status: string
  commissionRate: number
  rating: number
  totalOrders: number
  isOnline: boolean
  autoAccept: boolean
  vacationStart: string | null
  vacationEnd: string | null
  panNumber: string | null
  gstNumber: string | null
  fssaiNumber: string | null
  bankAccountNo: string | null
  bankIfsc: string | null
  bankName: string | null
  deliveryRadiusKm: number
  city: { id: string; name: string; slug: string }
  workingHours: {
    id: string
    dayOfWeek: number
    openTime: string
    closeTime: string
    isClosed: boolean
  }[]
  slots: {
    id: string
    isEnabled: boolean
    customCharge: number | null
    slot: { id: string; name: string; slug: string; startTime: string; endTime: string; baseCharge: number }
  }[]
  pincodes: {
    id: string
    pincode: string
    deliveryCharge: number
    pendingCharge: number | null
    isActive: boolean
  }[]
  categories: string[]
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function VendorSettingsPage() {
  const [settings, setSettings] = useState<VendorSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Editable fields
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    address: "",
    isOnline: false,
    autoAccept: false,
    vacationStart: "",
    vacationEnd: "",
    panNumber: "",
    gstNumber: "",
    fssaiNumber: "",
    bankAccountNo: "",
    bankIfsc: "",
    bankName: "",
    deliveryRadiusKm: "10",
  })

  // Pincode management state
  const [editPincodes, setEditPincodes] = useState<
    { pincode: string; deliveryCharge: number; pendingCharge: number | null; proposedCharge: string }[]
  >([])
  const [newPincode, setNewPincode] = useState("")
  const [savingPincodes, setSavingPincodes] = useState(false)
  const [pincodeError, setPincodeError] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/vendor/settings")
      const json = await res.json()
      if (json.success) {
        setSettings(json.data)
        setForm({
          businessName: json.data.businessName,
          ownerName: json.data.ownerName,
          phone: json.data.phone,
          email: json.data.email || "",
          address: json.data.address,
          isOnline: json.data.isOnline,
          autoAccept: json.data.autoAccept,
          vacationStart: json.data.vacationStart
            ? json.data.vacationStart.split("T")[0]
            : "",
          vacationEnd: json.data.vacationEnd
            ? json.data.vacationEnd.split("T")[0]
            : "",
          panNumber: json.data.panNumber || "",
          gstNumber: json.data.gstNumber || "",
          fssaiNumber: json.data.fssaiNumber || "",
          bankAccountNo: json.data.bankAccountNo || "",
          bankIfsc: json.data.bankIfsc || "",
          bankName: json.data.bankName || "",
          deliveryRadiusKm: json.data.deliveryRadiusKm?.toString() ?? "10",
        })
        // Initialize editable pincodes
        setEditPincodes(
          (json.data.pincodes || []).map((p: { pincode: string; deliveryCharge: number; pendingCharge: number | null }) => ({
            pincode: p.pincode,
            deliveryCharge: p.deliveryCharge,
            pendingCharge: p.pendingCharge,
            proposedCharge: (p.pendingCharge ?? p.deliveryCharge).toString(),
          }))
        )
      } else {
        setError(json.error || "Failed to load settings")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Vendor's categories for conditional FSSAI validation
  const vendorCategories = settings?.categories || []
  const needsFssai = requiresFssai(vendorCategories)

  const handleSave = async () => {
    // Client-side GST/FSSAI validation
    if (form.gstNumber && !GST_REGEX.test(form.gstNumber)) {
      setError("Invalid GST number format (e.g. 22AAAAA0000A1Z5)")
      return
    }
    if (needsFssai && !form.fssaiNumber) {
      setError("FSSAI number is required for food category vendors")
      return
    }
    if (form.fssaiNumber && !FSSAI_REGEX.test(form.fssaiNumber)) {
      setError("Invalid FSSAI number format (must be 14 digits)")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/vendor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          vacationStart: form.vacationStart || null,
          vacationEnd: form.vacationEnd || null,
          panNumber: form.panNumber || undefined,
          gstNumber: form.gstNumber || undefined,
          fssaiNumber: form.fssaiNumber || undefined,
          bankAccountNo: form.bankAccountNo || undefined,
          bankIfsc: form.bankIfsc || undefined,
          bankName: form.bankName || undefined,
          deliveryRadiusKm: parseFloat(form.deliveryRadiusKm) || 10,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess("Settings saved successfully")
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(json.error || "Failed to save")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setSaving(false)
    }
  }

  const handleAddPincode = () => {
    const pin = newPincode.trim()
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError("Enter a valid 6-digit pincode")
      return
    }
    if (editPincodes.some(p => p.pincode === pin)) {
      setPincodeError("Pincode already added")
      return
    }
    setPincodeError(null)
    setEditPincodes(prev => [...prev, { pincode: pin, deliveryCharge: 0, pendingCharge: null, proposedCharge: "0" }])
    setNewPincode("")
  }

  const handleRemovePincode = (pincode: string) => {
    setEditPincodes(prev => prev.filter(p => p.pincode !== pincode))
  }

  const handleSavePincodes = async () => {
    setSavingPincodes(true)
    setPincodeError(null)
    try {
      const pincodeList = editPincodes.map(p => p.pincode)

      // Build surcharge proposals for pincodes where vendor changed the charge
      const chargeProposals = editPincodes
        .filter(p => {
          const proposed = parseFloat(p.proposedCharge) || 0
          return proposed !== p.deliveryCharge
        })
        .map(p => ({
          pincode: p.pincode,
          charge: parseFloat(p.proposedCharge) || 0,
        }))

      const res = await fetch("/api/vendor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincodes: pincodeList,
          ...(chargeProposals.length > 0 ? { pincodeCharges: chargeProposals } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(
          chargeProposals.length > 0
            ? "Pincodes saved. Surcharge changes sent for admin approval."
            : "Pincodes saved successfully"
        )
        setTimeout(() => setSuccess(null), 4000)
        // Refresh to get updated data
        fetchSettings()
      } else {
        setPincodeError(json.error || "Failed to save pincodes")
      }
    } catch {
      setPincodeError("Failed to connect to server")
    } finally {
      setSavingPincodes(false)
    }
  }

  const toggleOnline = async () => {
    const newValue = !form.isOnline
    setForm((prev) => ({ ...prev, isOnline: newValue }))
    try {
      await fetch("/api/vendor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: newValue }),
      })
    } catch {
      setForm((prev) => ({ ...prev, isOnline: !newValue }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 animate-pulse rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={fetchSettings} className="mt-3 text-sm font-medium text-red-700 underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your store profile and business details
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Online toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            {form.isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="font-medium text-slate-900">Store Status</p>
              <p className="text-sm text-slate-500">
                {form.isOnline
                  ? "You are online and accepting orders"
                  : "You are offline. Customers cannot place orders"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              form.isOnline
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            {form.isOnline ? "Go Offline" : "Go Online"}
          </button>
        </CardContent>
      </Card>

      {/* Store info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5" />
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Business Name
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Owner Name
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              City: {settings?.city.name}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={form.deliveryRadiusKm}
                onChange={(e) =>
                  setForm({ ...form, deliveryRadiusKm: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Maximum distance from your shop for deliveries
              </p>
            </div>
          </div>

          {/* Auto-accept toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Auto-accept orders
              </p>
              <p className="text-xs text-slate-500">
                Automatically confirm incoming orders without manual review
              </p>
            </div>
            <button
              onClick={() => setForm({ ...form, autoAccept: !form.autoAccept })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                form.autoAccept
                  ? "bg-teal-100 text-teal-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {form.autoAccept ? "Enabled" : "Disabled"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Vacation mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Vacation Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Set vacation dates to stop receiving orders during a specific period
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Start Date
              </label>
              <input
                type="date"
                value={form.vacationStart}
                onChange={(e) =>
                  setForm({ ...form, vacationStart: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                End Date
              </label>
              <input
                type="date"
                value={form.vacationEnd}
                onChange={(e) =>
                  setForm({ ...form, vacationEnd: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                PAN Number
              </label>
              <input
                type="text"
                value={form.panNumber}
                onChange={(e) =>
                  setForm({ ...form, panNumber: e.target.value.toUpperCase() })
                }
                placeholder="ABCDE1234F"
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                GST Number
                <Badge className="bg-red-100 text-red-700 text-[10px]">Required</Badge>
              </label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) =>
                  setForm({ ...form, gstNumber: e.target.value.toUpperCase() })
                }
                placeholder="22AAAAA0000A1Z5"
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  form.gstNumber && !GST_REGEX.test(form.gstNumber)
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "focus:border-teal-500 focus:ring-teal-500"
                }`}
              />
              {form.gstNumber && !GST_REGEX.test(form.gstNumber) && (
                <p className="mt-1 text-xs text-red-600">Invalid GST format</p>
              )}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                FSSAI Number
                {needsFssai && (
                  <Badge className="bg-red-100 text-red-700 text-[10px]">Required</Badge>
                )}
              </label>
              <input
                type="text"
                value={form.fssaiNumber}
                onChange={(e) =>
                  setForm({ ...form, fssaiNumber: e.target.value.replace(/\D/g, "").slice(0, 14) })
                }
                placeholder="14-digit FSSAI number"
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  form.fssaiNumber && !FSSAI_REGEX.test(form.fssaiNumber)
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "focus:border-teal-500 focus:ring-teal-500"
                }`}
              />
              {needsFssai && !form.fssaiNumber && (
                <p className="mt-1 text-xs text-amber-600">Required for food categories</p>
              )}
              {form.fssaiNumber && !FSSAI_REGEX.test(form.fssaiNumber) && (
                <p className="mt-1 text-xs text-red-600">Must be 14 digits</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) =>
                  setForm({ ...form, bankName: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Account Number
              </label>
              <input
                type="text"
                value={form.bankAccountNo}
                onChange={(e) =>
                  setForm({ ...form, bankAccountNo: e.target.value })
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                IFSC Code
              </label>
              <input
                type="text"
                value={form.bankIfsc}
                onChange={(e) =>
                  setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })
                }
                placeholder="SBIN0001234"
                className="w-full rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working hours (read-only for now) */}
      {settings?.workingHours && settings.workingHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Working Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {settings.workingHours.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {dayNames[wh.dayOfWeek]}
                  </span>
                  {wh.isClosed ? (
                    <Badge className="bg-red-100 text-red-800">Closed</Badge>
                  ) : (
                    <span className="text-slate-600">
                      {wh.openTime} - {wh.closeTime}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery pincodes (editable) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Delivery Pincodes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new pincode */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPincode}
              onChange={(e) => {
                setNewPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                setPincodeError(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddPincode()}
              placeholder="Enter 6-digit pincode"
              className="w-40 rounded-md border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={handleAddPincode}
              className="flex items-center gap-1 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {pincodeError && (
            <p className="text-xs text-red-600">{pincodeError}</p>
          )}

          {/* Pincode list with surcharge inputs */}
          {editPincodes.length === 0 ? (
            <p className="text-sm text-slate-400">No delivery pincodes configured</p>
          ) : (
            <div className="space-y-2">
              {editPincodes.map((p) => (
                <div
                  key={p.pincode}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <span className="font-mono text-sm text-slate-700 w-16">{p.pincode}</span>

                  {/* Surcharge input */}
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-slate-400">Surcharge ₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={p.proposedCharge}
                      onChange={(e) =>
                        setEditPincodes(prev =>
                          prev.map(pc =>
                            pc.pincode === p.pincode
                              ? { ...pc, proposedCharge: e.target.value }
                              : pc
                          )
                        )
                      }
                      className="w-20 rounded border px-2 py-1 text-sm text-right focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Status badge */}
                  {p.pendingCharge != null && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                      Pending: ₹{p.pendingCharge}
                    </Badge>
                  )}
                  {p.deliveryCharge > 0 && p.pendingCharge == null && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Approved: ₹{p.deliveryCharge}
                    </Badge>
                  )}

                  <button
                    onClick={() => handleRemovePincode(p.pincode)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Surcharge changes require admin approval before they take effect.
          </p>

          <button
            onClick={handleSavePincodes}
            disabled={savingPincodes}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {savingPincodes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingPincodes ? "Saving..." : "Save Pincodes"}
          </button>
        </CardContent>
      </Card>

      {/* Store status info */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-6 text-sm text-slate-600">
          <span>
            Status: <Badge className={
              settings?.status === "APPROVED"
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }>{settings?.status}</Badge>
          </span>
          <span>Commission: {settings?.commissionRate}%</span>
          <span>Rating: {settings?.rating ? Number(settings.rating).toFixed(1) : "N/A"}</span>
          <span>Total Orders: {settings?.totalOrders}</span>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  )
}
