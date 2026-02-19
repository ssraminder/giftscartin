"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react"

// ==================== Types ====================

interface CityZone {
  id?: string
  name: string
  pincodes: string[]
  extraCharge: number
  isActive?: boolean
}

interface CityData {
  id: string
  name: string
  slug: string
  state: string
  isActive: boolean
  lat: number
  lng: number
  baseDeliveryCharge: number
  freeDeliveryAbove: number
  zones: CityZone[]
}

interface CityFormProps {
  city?: CityData
}

// ==================== Helpers ====================

const generateSlug = (name: string) =>
  name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

function parsePincodes(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter((p) => /^\d{6}$/.test(p))
}

function pincodesToText(pincodes: string[]): string {
  return pincodes.join('\n')
}

// ==================== Component ====================

export function CityForm({ city }: CityFormProps) {
  const router = useRouter()
  const isEdit = !!city

  // Form state
  const [name, setName] = useState(city?.name ?? '')
  const [slug, setSlug] = useState(city?.slug ?? '')
  const [state, setState] = useState(city?.state ?? '')
  const [isActive, setIsActive] = useState(city?.isActive ?? true)
  const [lat, setLat] = useState(city?.lat?.toString() ?? '')
  const [lng, setLng] = useState(city?.lng?.toString() ?? '')
  const [baseDeliveryCharge, setBaseDeliveryCharge] = useState(
    city?.baseDeliveryCharge?.toString() ?? '49'
  )
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(
    city?.freeDeliveryAbove?.toString() ?? '499'
  )

  // Zones state
  const [zones, setZones] = useState<
    Array<{ id?: string; name: string; pincodesText: string; extraCharge: string }>
  >(
    city?.zones?.length
      ? city.zones.map((z) => ({
          id: z.id,
          name: z.name,
          pincodesText: pincodesToText(z.pincodes),
          extraCharge: z.extraCharge.toString(),
        }))
      : [{ name: '', pincodesText: '', extraCharge: '0' }]
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEdit) {
      setSlug(generateSlug(value))
    }
  }

  const addZone = () => {
    setZones([...zones, { name: '', pincodesText: '', extraCharge: '0' }])
  }

  const removeZone = (index: number) => {
    if (zones.length <= 1) return
    setZones(zones.filter((_, i) => i !== index))
  }

  const updateZone = (index: number, field: string, value: string) => {
    setZones(
      zones.map((z, i) => (i === index ? { ...z, [field]: value } : z))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToast(null)

    // Validate required fields
    if (!name.trim()) {
      setToast({ type: 'error', message: 'City name is required.' })
      return
    }
    if (!slug.trim()) {
      setToast({ type: 'error', message: 'Slug is required.' })
      return
    }
    if (!state.trim()) {
      setToast({ type: 'error', message: 'State is required.' })
      return
    }
    if (!lat || !lng) {
      setToast({ type: 'error', message: 'Latitude and longitude are required.' })
      return
    }

    // Validate zones
    const parsedZones = zones.map((z) => ({
      id: z.id,
      name: z.name.trim(),
      pincodes: parsePincodes(z.pincodesText),
      extraCharge: parseFloat(z.extraCharge) || 0,
    }))

    const emptyZone = parsedZones.find((z) => !z.name)
    if (emptyZone) {
      setToast({ type: 'error', message: 'All zones must have a name.' })
      return
    }

    const emptyPincodes = parsedZones.find((z) => z.pincodes.length === 0)
    if (emptyPincodes) {
      setToast({
        type: 'error',
        message: `Zone "${emptyPincodes.name}" has no valid pincodes. Pincodes must be 6 digits.`,
      })
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      state: state.trim(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      baseDeliveryCharge: parseFloat(baseDeliveryCharge) || 0,
      freeDeliveryAbove: parseFloat(freeDeliveryAbove) || 0,
      isActive,
      zones: parsedZones,
    }

    try {
      const url = isEdit
        ? `/api/admin/cities/${city.id}`
        : '/api/admin/cities'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success) {
        setToast({
          type: 'success',
          message: isEdit ? 'City updated successfully.' : 'City created successfully.',
        })
        setTimeout(() => {
          router.push('/admin/cities')
        }, 1000)
      } else {
        setToast({ type: 'error', message: json.error || 'Failed to save city.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Basic Info</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleNameChange(e.target.value)
              }
              placeholder="e.g. Ludhiana"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSlug(e.target.value)
              }
              placeholder="e.g. ludhiana"
            />
            <p className="text-xs text-slate-500">URL: /{slug || 'slug'}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setState(e.target.value)
              }
              placeholder="e.g. Punjab"
            />
          </div>

          <div className="space-y-2 flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Location</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLat(e.target.value)
              }
              placeholder="e.g. 30.9010"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLng(e.target.value)
              }
              placeholder="e.g. 75.8573"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Used for distance calculations. Find on Google Maps.
        </p>
      </div>

      {/* Delivery Settings */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Delivery Settings</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="baseDeliveryCharge">Base Delivery Charge (&#8377;)</Label>
            <Input
              id="baseDeliveryCharge"
              type="number"
              min="0"
              step="1"
              value={baseDeliveryCharge}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBaseDeliveryCharge(e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="freeDeliveryAbove">Free Delivery Above (&#8377;)</Label>
            <Input
              id="freeDeliveryAbove"
              type="number"
              min="0"
              step="1"
              value={freeDeliveryAbove}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFreeDeliveryAbove(e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Delivery Zones</h2>
            <p className="text-xs text-slate-500 mt-1">
              Zones define pincode groups with extra delivery charges.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addZone} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Zone
          </Button>
        </div>

        <div className="space-y-4">
          {zones.map((zone, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-3 sm:grid-cols-2 flex-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Zone Name</Label>
                    <Input
                      value={zone.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateZone(index, 'name', e.target.value)
                      }
                      placeholder="e.g. Core Zone"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Extra Charge (&#8377;)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={zone.extraCharge}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateZone(index, 'extraCharge', e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                {zones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeZone(index)}
                    className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 mt-5"
                    title="Remove zone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pincodes (one per line or comma-separated)</Label>
                <textarea
                  value={zone.pincodesText}
                  onChange={(e) => updateZone(index, 'pincodesText', e.target.value)}
                  placeholder={"141001\n141002\n141003"}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  {parsePincodes(zone.pincodesText).length} valid pincode
                  {parsePincodes(zone.pincodesText).length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Update City' : 'Create City'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/cities')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
