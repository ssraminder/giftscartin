"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { VendorAddressInput, type VendorAddressResult } from "@/components/vendor/address-input/vendor-address-input"

// ==================== Types ====================

interface WorkingHoursData {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

interface PincodeData {
  pincode: string
  deliveryCharge: number
}

interface CityOption {
  id: string
  name: string
}

interface VendorData {
  id: string
  businessName: string
  ownerName: string
  phone: string
  email: string | null
  cityId: string
  address: string
  lat?: number | null
  lng?: number | null
  categories: string[]
  commissionRate: number
  autoAccept: boolean
  status: string
  isOnline: boolean
  workingHours: WorkingHoursData[]
  pincodes: PincodeData[]
}

interface VendorFormProps {
  vendor?: VendorData
  cities: CityOption[]
}

// ==================== Constants ====================

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const CATEGORY_OPTIONS = [
  { value: "cakes", label: "Cakes" },
  { value: "flowers", label: "Flowers" },
  { value: "combos", label: "Combos" },
  { value: "plants", label: "Plants" },
  { value: "gifts", label: "Gifts" },
  { value: "sweets", label: "Sweets" },
  { value: "pastries", label: "Pastries" },
  { value: "chocolates", label: "Chocolates" },
]

const DEFAULT_WORKING_HOURS: WorkingHoursData[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  openTime: "09:00",
  closeTime: "21:00",
  isClosed: false,
}))

// ==================== Helpers ====================

function parsePincodes(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter((p) => /^\d{6}$/.test(p))
}

// ==================== Component ====================

export function VendorForm({ vendor, cities }: VendorFormProps) {
  const router = useRouter()
  const isEdit = !!vendor

  // Business Info
  const [businessName, setBusinessName] = useState(vendor?.businessName ?? "")
  const [ownerName, setOwnerName] = useState(vendor?.ownerName ?? "")
  const [phone, setPhone] = useState(vendor?.phone ?? "")
  const [email, setEmail] = useState(vendor?.email ?? "")
  const [cityId, setCityId] = useState(vendor?.cityId ?? "")
  const [addressData, setAddressData] = useState<VendorAddressResult | null>(
    vendor?.address
      ? {
          address: vendor.address,
          details: '',
          lat: vendor.lat ?? 0,
          lng: vendor.lng ?? 0,
          pincode: '',
          city: '',
          state: '',
          source: 'manual',
        }
      : null
  )
  const [categories, setCategories] = useState<string[]>(vendor?.categories ?? [])

  // Settings
  const [commissionRate, setCommissionRate] = useState(
    vendor?.commissionRate?.toString() ?? "12"
  )
  const [autoAccept, setAutoAccept] = useState(vendor?.autoAccept ?? false)
  const [status, setStatus] = useState(vendor?.status ?? "APPROVED")

  // Working Hours
  const [workingHours, setWorkingHours] = useState<WorkingHoursData[]>(
    vendor?.workingHours?.length === 7
      ? vendor.workingHours
      : DEFAULT_WORKING_HOURS
  )

  // Pincodes
  const [pincodesText, setPincodesText] = useState(
    vendor?.pincodes?.map((p) => p.pincode).join("\n") ?? ""
  )
  const [deliveryCharge, setDeliveryCharge] = useState(
    vendor?.pincodes?.[0]?.deliveryCharge?.toString() ?? "0"
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    if (type === "error") {
      setTimeout(() => setToast(null), 5000)
    }
  }

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const updateWorkingHour = (
    dayOfWeek: number,
    field: keyof WorkingHoursData,
    value: string | boolean
  ) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)

    // Validation
    if (!businessName.trim()) {
      showToast("error", "Business name is required.")
      return
    }
    if (!ownerName.trim()) {
      showToast("error", "Owner name is required.")
      return
    }
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      showToast("error", "Invalid phone number. Must be +91 followed by 10 digits starting with 6-9.")
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("error", "Valid email address is required.")
      return
    }
    if (!cityId) {
      showToast("error", "Please select a city.")
      return
    }
    if (!addressData?.lat || !addressData?.lng) {
      showToast("error", "Please search or pin your shop location.")
      return
    }
    if (!addressData?.pincode) {
      showToast("error", "Could not detect pincode — please try map picker.")
      return
    }

    // Parse pincodes
    const parsedPincodes = parsePincodes(pincodesText)
    const chargeNum = parseFloat(deliveryCharge) || 0

    const payload: Record<string, unknown> = {
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      cityId,
      address: addressData
        ? `${addressData.details ? addressData.details + ', ' : ''}${addressData.address}`.trim()
        : '',
      lat: addressData?.lat ?? null,
      lng: addressData?.lng ?? null,
      categories,
      commissionRate: parseFloat(commissionRate) || 12,
      autoAccept,
      workingHours,
    }

    if (isEdit) {
      payload.status = status
    }

    if (parsedPincodes.length > 0) {
      payload.pincodes = parsedPincodes.map((p) => ({
        pincode: p,
        deliveryCharge: chargeNum,
      }))
    } else {
      payload.pincodes = []
    }

    setSaving(true)

    try {
      const url = isEdit
        ? `/api/admin/vendors/${vendor.id}`
        : "/api/admin/vendors"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        showToast(
          "success",
          isEdit ? "Vendor updated successfully." : "Vendor created successfully."
        )
        setTimeout(() => {
          router.push("/admin/vendors")
        }, 1000)
      } else {
        showToast("error", json.error || "Failed to save vendor.")
      }
    } catch {
      showToast("error", "Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Business Info */}
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Business Info</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBusinessName(e.target.value)
              }
              placeholder="e.g. Sweet Delights Bakery"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerName">Owner Name</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOwnerName(e.target.value)
              }
              placeholder="e.g. Rajesh Kumar"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
              placeholder="e.g. 9876543210"
              maxLength={10}
            />
            <p className="text-xs text-slate-500">10-digit Indian mobile number</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              placeholder="e.g. vendor@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cityId">City</Label>
          <select
            id="cityId"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <VendorAddressInput
          value={addressData}
          onChange={setAddressData}
          label="Shop Address"
          required
        />

        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  categories.includes(cat.value)
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Settings</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commissionRate">Commission Rate (%)</Label>
            <Input
              id="commissionRate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCommissionRate(e.target.value)
              }
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={autoAccept}
            onChange={(e) => setAutoAccept(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Auto-accept orders
          </span>
        </label>
      </div>

      {/* Working Hours */}
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Working Hours</h2>
        <p className="text-xs text-slate-500">
          Set operating hours for each day of the week.
        </p>

        <div className="space-y-3">
          {workingHours
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((wh) => (
              <div
                key={wh.dayOfWeek}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 px-4 py-2.5"
              >
                <span className="w-24 text-sm font-medium text-slate-700">
                  {DAY_LABELS[wh.dayOfWeek]}
                </span>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={wh.isClosed}
                    onChange={(e) =>
                      updateWorkingHour(wh.dayOfWeek, "isClosed", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-500">Closed</span>
                </label>

                {!wh.isClosed && (
                  <>
                    <input
                      type="time"
                      value={wh.openTime}
                      onChange={(e) =>
                        updateWorkingHour(wh.dayOfWeek, "openTime", e.target.value)
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={wh.closeTime}
                      onChange={(e) =>
                        updateWorkingHour(wh.dayOfWeek, "closeTime", e.target.value)
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Delivery Pincodes */}
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Delivery Pincodes</h2>
        <p className="text-xs text-slate-500">
          Pincodes this vendor delivers to. One per line or comma-separated.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pincodes</Label>
            <textarea
              value={pincodesText}
              onChange={(e) => setPincodesText(e.target.value)}
              placeholder={"160001\n160002\n160003"}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-slate-500">
              {parsePincodes(pincodesText).length} valid pincode
              {parsePincodes(pincodesText).length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryCharge">
              Extra Delivery Charge (&#8377;)
            </Label>
            <Input
              id="deliveryCharge"
              type="number"
              min="0"
              step="1"
              value={deliveryCharge}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDeliveryCharge(e.target.value)
              }
              placeholder="0"
            />
            <p className="text-xs text-slate-500">
              Applied to all pincodes above.
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Update Vendor" : "Create Vendor"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/vendors")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
