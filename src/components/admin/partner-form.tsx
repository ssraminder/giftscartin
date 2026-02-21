'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface City {
  id: string
  name: string
  slug: string
}

interface Vendor {
  id: string
  businessName: string
  cityId: string
}

interface PartnerFormData {
  name: string
  refCode: string
  commissionPercent: string
  defaultCityId: string
  defaultVendorId: string
  logoUrl: string
  primaryColor: string
  showPoweredBy: boolean
  isActive: boolean
}

interface PartnerFormProps {
  initialData?: Partial<PartnerFormData>
  partnerId?: string
}

export function PartnerForm({ initialData, partnerId }: PartnerFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<PartnerFormData>({
    name: '',
    refCode: '',
    commissionPercent: '5',
    defaultCityId: '',
    defaultVendorId: '',
    logoUrl: '',
    primaryColor: '#E91E63',
    showPoweredBy: true,
    isActive: true,
    ...initialData,
  })
  const [cities, setCities] = useState<City[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load cities on mount
  useEffect(() => {
    fetch('/api/admin/cities')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCities(d.data)
      })
      .catch(() => {})
  }, [])

  // Load vendors when city changes
  useEffect(() => {
    if (!form.defaultCityId) {
      setVendors([])
      if (!initialData?.defaultVendorId) {
        setForm((f) => ({ ...f, defaultVendorId: '' }))
      }
      return
    }

    setLoadingVendors(true)
    fetch(`/api/admin/vendors?cityId=${form.defaultCityId}&status=APPROVED&pageSize=100`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setVendors(d.data?.items || d.data || [])
        setLoadingVendors(false)
      })
      .catch(() => setLoadingVendors(false))
  }, [form.defaultCityId, initialData?.defaultVendorId])

  // Auto-generate ref code from name (only for new partners)
  const handleNameChange = (name: string) => {
    const refCode = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    setForm((f) => ({ ...f, name, refCode: partnerId ? f.refCode : refCode }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.refCode.trim()) e.refCode = 'Ref code required'
    if (!/^[a-z0-9-]+$/.test(form.refCode))
      e.refCode = 'Only lowercase letters, numbers, hyphens'
    if (!form.commissionPercent || isNaN(Number(form.commissionPercent))) {
      e.commissionPercent = 'Valid commission % required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)

    const url = partnerId
      ? `/api/admin/partners/${partnerId}`
      : '/api/admin/partners'
    const method = partnerId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          commissionPercent: Number(form.commissionPercent),
          defaultCityId: form.defaultCityId || null,
          defaultVendorId: form.defaultVendorId || null,
          logoUrl: form.logoUrl || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/admin/partners')
      } else {
        setErrors({ submit: data.error || 'Save failed' })
      }
    } catch {
      setErrors({ submit: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      {/* Name */}
      <div>
        <Label>Partner Name *</Label>
        <Input
          className="text-base mt-1"
          placeholder="e.g. Sweet Delights Bakery"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Ref Code */}
      <div>
        <Label>Ref Code *</Label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-400 shrink-0">?ref=</span>
          <Input
            className="text-base font-mono"
            placeholder="sweet-delights"
            value={form.refCode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                refCode: e.target.value.toLowerCase(),
              }))
            }
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Share link: giftscart.netlify.app?ref={form.refCode || 'your-code'}
        </p>
        {errors.refCode && (
          <p className="text-xs text-red-500 mt-1">{errors.refCode}</p>
        )}
      </div>

      {/* Commission */}
      <div>
        <Label>Commission % *</Label>
        <Input
          type="number"
          min="0"
          max="30"
          step="0.5"
          className="text-base mt-1 w-32"
          value={form.commissionPercent}
          onChange={(e) =>
            setForm((f) => ({ ...f, commissionPercent: e.target.value }))
          }
        />
        {errors.commissionPercent && (
          <p className="text-xs text-red-500 mt-1">
            {errors.commissionPercent}
          </p>
        )}
      </div>

      {/* Default City */}
      <div>
        <Label>Default City</Label>
        <select
          className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
          value={form.defaultCityId}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              defaultCityId: e.target.value,
              defaultVendorId: '',
            }))
          }
        >
          <option value="">No default — show city selection modal</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {form.defaultCityId && (
          <p className="text-xs text-gray-400 mt-1">
            Customers arriving via this partner&apos;s link will land directly
            in {cities.find((c) => c.id === form.defaultCityId)?.name}
          </p>
        )}
      </div>

      {/* Default Vendor */}
      <div>
        <Label>Default Vendor</Label>
        <select
          className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white
                     disabled:bg-gray-50 disabled:text-gray-400"
          value={form.defaultVendorId}
          onChange={(e) =>
            setForm((f) => ({ ...f, defaultVendorId: e.target.value }))
          }
          disabled={!form.defaultCityId || loadingVendors}
        >
          <option value="">
            {!form.defaultCityId
              ? 'Select a city first'
              : loadingVendors
              ? 'Loading vendors...'
              : 'No default — show all vendors'}
          </option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.businessName}
            </option>
          ))}
        </select>
        {form.defaultVendorId && (
          <p className="text-xs text-gray-400 mt-1">
            Only this vendor&apos;s products will be shown to customers from
            this partner
          </p>
        )}
      </div>

      {/* Logo URL */}
      <div>
        <Label>
          Logo URL <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          className="text-base mt-1"
          placeholder="https://..."
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
        />
      </div>

      {/* Primary Color */}
      <div>
        <Label>Brand Color</Label>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="color"
            value={form.primaryColor}
            onChange={(e) =>
              setForm((f) => ({ ...f, primaryColor: e.target.value }))
            }
            className="h-10 w-16 rounded border border-gray-200 cursor-pointer"
          />
          <span className="text-sm font-mono text-gray-500">
            {form.primaryColor}
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.showPoweredBy}
            onChange={(e) =>
              setForm((f) => ({ ...f, showPoweredBy: e.target.checked }))
            }
            className="h-4 w-4 accent-pink-500"
          />
          <span className="text-sm">
            Show &ldquo;Powered by Gifts Cart India&rdquo; badge
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.checked }))
            }
            className="h-4 w-4 accent-pink-500"
          />
          <span className="text-sm">Partner is active</span>
        </label>
      </div>

      {/* Submit */}
      {errors.submit && (
        <p className="text-sm text-red-500">{errors.submit}</p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/admin/partners')}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600
                     disabled:opacity-50 font-medium"
        >
          {saving
            ? 'Saving...'
            : partnerId
            ? 'Save Changes'
            : 'Create Partner'}
        </button>
      </div>
    </div>
  )
}
