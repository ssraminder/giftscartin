'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  X,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ==================== Types ====================

interface Banner {
  id: string
  titleHtml: string
  subtitleHtml: string | null
  imageUrl: string
  subjectImageUrl: string | null
  ctaText: string
  ctaLink: string
  secondaryCtaText: string | null
  secondaryCtaLink: string | null
  textPosition: string
  overlayStyle: string
  badgeText: string | null
  isActive: boolean
  sortOrder: number
  validFrom: string | null
  validUntil: string | null
  targetCitySlug: string | null
  theme: string
  createdAt: string
  updatedAt: string
}

interface BannerFormData {
  imageUrl: string
  subjectImageUrl: string
  titleHtml: string
  subtitleHtml: string
  ctaText: string
  ctaLink: string
  secondaryCtaText: string
  secondaryCtaLink: string
  badgeText: string
  textPosition: string
  overlayStyle: string
  validFrom: string
  validUntil: string
  targetCitySlug: string
  isActive: boolean
  theme: string
}

const EMPTY_FORM: BannerFormData = {
  imageUrl: '',
  subjectImageUrl: '',
  titleHtml: '',
  subtitleHtml: '',
  ctaText: 'Shop Now',
  ctaLink: '/',
  secondaryCtaText: '',
  secondaryCtaLink: '',
  badgeText: '',
  textPosition: 'left',
  overlayStyle: 'dark-left',
  validFrom: '',
  validUntil: '',
  targetCitySlug: '',
  isActive: true,
  theme: 'blush',
}

const THEME_SWATCHES: { value: string; color: string; label: string }[] = [
  { value: 'blush', color: '#fce4ec', label: 'Blush' },
  { value: 'purple', color: '#ede7f6', label: 'Purple' },
  { value: 'gold', color: '#fff8e1', label: 'Gold' },
  { value: 'navy', color: '#1a237e', label: 'Navy' },
  { value: 'mint', color: '#e8f5e9', label: 'Mint' },
  { value: 'peach', color: '#fff3e0', label: 'Peach' },
]

const CITY_OPTIONS = [
  { value: '', label: 'All Cities' },
  { value: 'chandigarh', label: 'Chandigarh' },
  { value: 'mohali', label: 'Mohali' },
  { value: 'panchkula', label: 'Panchkula' },
  { value: 'patiala', label: 'Patiala' },
]

// ==================== Component ====================

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Upload state (background)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Upload state (hero image)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null)

  // AI generation state
  const [aiTheme, setAiTheme] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // ==================== Data Fetching ====================

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/banners')
      const json = await res.json()
      if (json.success) {
        setBanners(json.data)
      } else {
        setError(json.error || 'Failed to fetch banners')
      }
    } catch {
      setError('Failed to fetch banners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  // ==================== Actions ====================

  const handleToggleActive = async (banner: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setBanners(prev => prev.map(b => b.id === banner.id ? json.data : b))
      } else {
        showToast('error', 'Failed to update banner')
      }
    } catch {
      showToast('error', 'Failed to update banner')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const current = banners[index]
    const above = banners[index - 1]
    try {
      await Promise.all([
        fetch(`/api/admin/banners/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: above.sortOrder }),
        }),
        fetch(`/api/admin/banners/${above.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ])
      fetchBanners()
    } catch {
      showToast('error', 'Failed to reorder')
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index >= banners.length - 1) return
    const current = banners[index]
    const below = banners[index + 1]
    try {
      await Promise.all([
        fetch(`/api/admin/banners/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: below.sortOrder }),
        }),
        fetch(`/api/admin/banners/${below.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ])
      fetchBanners()
    } catch {
      showToast('error', 'Failed to reorder')
    }
  }

  const openCreateModal = () => {
    setEditingBanner(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner)
    setForm({
      imageUrl: banner.imageUrl,
      subjectImageUrl: banner.subjectImageUrl || '',
      titleHtml: banner.titleHtml,
      subtitleHtml: banner.subtitleHtml || '',
      ctaText: banner.ctaText,
      ctaLink: banner.ctaLink,
      secondaryCtaText: banner.secondaryCtaText || '',
      secondaryCtaLink: banner.secondaryCtaLink || '',
      badgeText: banner.badgeText || '',
      textPosition: banner.textPosition,
      overlayStyle: banner.overlayStyle,
      validFrom: banner.validFrom ? banner.validFrom.split('T')[0] : '',
      validUntil: banner.validUntil ? banner.validUntil.split('T')[0] : '',
      targetCitySlug: banner.targetCitySlug || '',
      isActive: Boolean(banner.isActive),
      theme: banner.theme || 'blush',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    // Validate
    const errors: Record<string, string> = {}
    if (!form.titleHtml?.trim()) errors.titleHtml = 'Title HTML is required'
    if (!form.imageUrl?.trim()) errors.imageUrl = 'Image URL is required'
    if (!form.ctaText?.trim()) errors.ctaText = 'CTA text is required'
    if (!form.ctaLink?.trim()) errors.ctaLink = 'CTA link is required'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        titleHtml: form.titleHtml,
        subtitleHtml: form.subtitleHtml || null,
        imageUrl: form.imageUrl,
        subjectImageUrl: form.subjectImageUrl || null,
        ctaText: form.ctaText,
        ctaLink: form.ctaLink,
        secondaryCtaText: form.secondaryCtaText || null,
        secondaryCtaLink: form.secondaryCtaLink || null,
        badgeText: form.badgeText || null,
        textPosition: form.textPosition,
        overlayStyle: form.overlayStyle,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        targetCitySlug: form.targetCitySlug || null,
        isActive: Boolean(form.isActive),
        theme: form.theme || 'blush',
      }

      const url = editingBanner
        ? `/api/admin/banners/${editingBanner.id}`
        : '/api/admin/banners'
      const method = editingBanner ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setModalOpen(false)
        fetchBanners()
        showToast('success', 'Banner saved successfully')
      } else {
        showToast('error', json.error || 'Failed to save banner')
      }
    } catch {
      showToast('error', 'Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/banners/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setBanners(prev => prev.filter(b => b.id !== deleteTarget.id))
        showToast('success', 'Banner deleted')
      } else {
        showToast('error', json.error || 'Failed to delete banner')
      }
    } catch {
      showToast('error', 'Failed to delete banner')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ==================== Helpers ====================

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Max 5MB.')
      return
    }
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'background')
    try {
      const res = await fetch('/api/admin/banners/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setForm(f => ({ ...f, imageUrl: json.data.url }))
        setFormErrors(e2 => ({ ...e2, imageUrl: '' }))
      } else {
        setUploadError(json.error || 'Upload failed')
      }
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setHeroUploadError('File too large. Max 5MB.')
      return
    }
    setHeroUploading(true)
    setHeroUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'hero')
    try {
      const res = await fetch('/api/admin/banners/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setForm(f => ({ ...f, subjectImageUrl: json.data.url }))
        if (json.data.warning) {
          showToast('error', json.data.warning)
        }
      } else {
        setHeroUploadError(json.error || 'Upload failed')
      }
    } catch {
      setHeroUploadError('Upload failed. Please try again.')
    } finally {
      setHeroUploading(false)
      e.target.value = ''
    }
  }

  async function handleAiGenerate() {
    if (!aiTheme?.trim()) return
    setAiGenerating(true)
    setAiError(null)

    try {
      // Start background job
      const res = await fetch('/api/admin/banners/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: aiTheme }),
      })
      const json = await res.json()
      if (!json.success || !json.jobId) {
        setAiError(json.error || 'Failed to start generation.')
        setAiGenerating(false)
        return
      }

      const jobId = json.jobId

      // Poll every 3 seconds for up to 2 minutes
      let attempts = 0
      const maxAttempts = 40
      const poll = setInterval(async () => {
        attempts++
        try {
          const pollRes = await fetch(`/api/admin/banners/generate/${jobId}`)
          const pollJson = await pollRes.json()
          const data = pollJson.data

          if (data?.status === 'done') {
            clearInterval(poll)
            setForm(f => ({
              ...f,
              ...(data.result?.imageUrl ? { imageUrl: data.result.imageUrl } : {}),
              ...(data.result?.subjectImageUrl ? { subjectImageUrl: data.result.subjectImageUrl } : {}),
              ...(data.result?.titleHtml ? { titleHtml: data.result.titleHtml } : {}),
              ...(data.result?.subtitleHtml ? { subtitleHtml: data.result.subtitleHtml } : {}),
              ...(data.result?.ctaText ? { ctaText: data.result.ctaText } : {}),
              ...(data.result?.ctaLink ? { ctaLink: data.result.ctaLink } : {}),
              ...(data.result?.secondaryCtaText ? { secondaryCtaText: data.result.secondaryCtaText } : {}),
              ...(data.result?.secondaryCtaLink ? { secondaryCtaLink: data.result.secondaryCtaLink } : {}),
              ...(data.result?.badgeText ? { badgeText: data.result.badgeText } : {}),
              ...(data.result?.overlayStyle ? { overlayStyle: data.result.overlayStyle } : {}),
              ...(data.result?.textPosition ? { textPosition: data.result.textPosition } : {}),
            }))
            setFormErrors({})
            setAiGenerating(false)
          } else if (data?.status === 'failed' || attempts >= maxAttempts) {
            clearInterval(poll)
            setAiError(data?.error || 'Generation timed out. Please try again.')
            setAiGenerating(false)
          }
        } catch {
          // Ignore individual poll failures, keep trying
          if (attempts >= maxAttempts) {
            clearInterval(poll)
            setAiError('Generation timed out. Please try again.')
            setAiGenerating(false)
          }
        }
      }, 3000)
    } catch {
      setAiError('Generation failed. Please try again.')
      setAiGenerating(false)
    }
  }

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banner / Slider Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage homepage banners and hero sliders
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="mr-2 h-4 w-4" />
          Add New Banner
        </Button>
      </div>

      {/* Banner List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBanners}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border py-16 text-slate-400">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm">No banners yet. Click &quot;Add New Banner&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`flex items-center gap-3 rounded-lg border bg-white p-3 transition-opacity ${
                banner.isActive
                  ? 'border-l-4 border-l-green-500'
                  : 'border-l-4 border-l-gray-300 opacity-60'
              }`}
            >
              {/* Drag handle */}
              <GripVertical className="h-5 w-5 shrink-0 text-slate-300" />

              {/* Thumbnail */}
              {banner.imageUrl && banner.imageUrl?.trim() !== '' ? (
                <div className="relative w-16 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={banner.imageUrl}
                    alt="Banner"
                    fill
                    style={{ objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              ) : (
                <div className="w-16 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: THEME_SWATCHES.find(s => s.value === banner.theme)?.color || '#fce4ec',
                      border: '1px solid rgba(0,0,0,0.1)',
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  />
                  <div
                    className="truncate text-sm font-medium text-slate-900"
                    dangerouslySetInnerHTML={{ __html: banner.titleHtml ?? '' }}
                  />
                </div>
                {banner.subtitleHtml && (
                  <div
                    className="truncate text-xs text-slate-500"
                    dangerouslySetInnerHTML={{ __html: banner.subtitleHtml ?? '' }}
                  />
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {banner.textPosition}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {banner.overlayStyle}
                  </Badge>
                  {banner.targetCitySlug && (
                    <Badge variant="outline" className="text-[10px]">
                      {banner.targetCitySlug}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Date range */}
                {(banner.validFrom || banner.validUntil) && (
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {banner.validFrom ? formatDate(banner.validFrom) : '...'}
                    {' – '}
                    {banner.validUntil ? formatDate(banner.validUntil) : '...'}
                  </span>
                )}

                {/* Reorder buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === banners.length - 1}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Active toggle */}
                <Switch
                  checked={Boolean(banner.isActive)}
                  onCheckedChange={() => handleToggleActive(banner)}
                />

                {/* Edit */}
                <Button variant="outline" size="sm" onClick={() => openEditModal(banner)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                {/* Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteTarget(banner)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== Create/Edit Modal ==================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</DialogTitle>
            <DialogDescription>
              {editingBanner
                ? 'Update banner content and settings.'
                : 'Add a new banner to the homepage slider.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* AI Generation Panel */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Generate with AI</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the theme e.g. Birthday cakes, Midnight delivery, Flowers..."
                  value={aiTheme}
                  onChange={e => setAiTheme(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiTheme?.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  {aiGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
                    : <><Sparkles className="w-4 h-4 mr-2" />Generate</>
                  }
                </Button>
              </div>
              {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
              <p className="text-xs text-purple-600 mt-2">
                Generates background image, hero product image (background removed), title, subtitle, CTA and badge text automatically
              </p>
            </div>

            {/* Theme Picker */}
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex items-center gap-3">
                {THEME_SWATCHES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    title={s.label}
                    onClick={() => setForm(f => ({ ...f, theme: s.value }))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: s.color,
                      outline: form.theme === s.value ? '2px solid #111' : '2px solid transparent',
                      outlineOffset: 3,
                      border: '1px solid rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Selected: {THEME_SWATCHES.find(s => s.value === form.theme)?.label || form.theme}
              </p>
            </div>

            {/* 1. Background Image */}
            <div className="space-y-2">
              <Label>Background Image</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 transition-colors">
                    {uploading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-pink-500" /><span className="text-sm text-gray-500">Uploading...</span></>
                      : <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Upload image</span></>
                    }
                  </div>
                </label>
                <span className="text-sm text-gray-400">or</span>
                <Input
                  placeholder="Paste Supabase / external URL"
                  value={form.imageUrl}
                  onChange={e => {
                    setForm(f => ({ ...f, imageUrl: e.target.value }))
                    setFormErrors(e2 => ({ ...e2, imageUrl: '' }))
                  }}
                  className="flex-1"
                />
              </div>
              {formErrors.imageUrl && (
                <p className="text-sm text-red-500">{formErrors.imageUrl}</p>
              )}
              {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
              <p className="text-xs text-gray-400">Full tile background. Landscape photos, abstract textures, or blurred scenes work best. 1536&times;864px recommended.</p>
              {form.imageUrl && form.imageUrl?.trim() !== '' ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100 border mt-1">
                  <Image src={form.imageUrl} alt="Background Preview" fill style={{ objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-36 rounded-lg bg-gray-100 border mt-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs">No background image selected</p>
                  </div>
                </div>
              )}
            </div>

            {/* 1b. Hero / Subject Image */}
            <div className="space-y-2">
              <Label>Hero Image</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleHeroImageUpload}
                    disabled={heroUploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors">
                    {heroUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-purple-500" /><span className="text-sm text-gray-500">Removing background...</span></>
                      : <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Upload hero image</span></>
                    }
                  </div>
                </label>
                <span className="text-sm text-gray-400">or</span>
                <Input
                  placeholder="Paste hero image URL (transparent PNG)"
                  value={form.subjectImageUrl}
                  onChange={e => setForm(f => ({ ...f, subjectImageUrl: e.target.value }))}
                  className="flex-1"
                />
              </div>
              {heroUploadError && <p className="text-sm text-red-500">{heroUploadError}</p>}
              <p className="text-xs text-gray-400">Product or subject photo. Background will be auto-removed after upload. PNG preferred, max 5MB.</p>
              {form.subjectImageUrl && form.subjectImageUrl?.trim() !== '' ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden checker-bg border mt-1 flex items-center justify-center">
                  <Image src={form.subjectImageUrl} alt="Hero Preview" fill style={{ objectFit: 'contain' }} />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, subjectImageUrl: '' }))}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-36 rounded-lg bg-gray-100 border mt-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs">No hero image (optional)</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Title HTML */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Title HTML{' '}
                <span className="font-normal text-slate-400">
                  (HTML allowed: &lt;strong&gt;, &lt;em&gt;, &lt;br/&gt;, &lt;span
                  style=&apos;color:...&apos;&gt;)
                </span>
              </label>
              <textarea
                rows={4}
                value={form.titleHtml}
                onChange={e => {
                  setForm(f => ({ ...f, titleHtml: e.target.value }))
                  setFormErrors(e2 => ({ ...e2, titleHtml: '' }))
                }}
                placeholder="<strong>Fresh Cakes,</strong><br/>Delivered Today"
                className="w-full rounded-md border px-3 py-2 font-mono text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              {formErrors.titleHtml && (
                <p className="mt-1 text-xs text-red-600">{formErrors.titleHtml}</p>
              )}
              {form.titleHtml && (
                <div className="mt-2 rounded bg-gray-900 p-3 text-2xl font-bold leading-tight text-white">
                  <span dangerouslySetInnerHTML={{ __html: form.titleHtml ?? '' }} />
                </div>
              )}
            </div>

            {/* 3. Subtitle HTML */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Subtitle HTML{' '}
                <span className="font-normal text-slate-400">
                  (HTML allowed)
                </span>
              </label>
              <textarea
                rows={3}
                value={form.subtitleHtml}
                onChange={e => setForm(f => ({ ...f, subtitleHtml: e.target.value }))}
                placeholder="Order by <strong>6 PM</strong> for same-day delivery"
                className="w-full rounded-md border px-3 py-2 font-mono text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              {form.subtitleHtml && (
                <div className="mt-2 rounded bg-gray-900 p-2 text-sm text-white/80">
                  <span dangerouslySetInnerHTML={{ __html: form.subtitleHtml ?? '' }} />
                </div>
              )}
            </div>

            {/* 4. CTA Button */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">CTA Text</label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={e => {
                    setForm(f => ({ ...f, ctaText: e.target.value }))
                    setFormErrors(e2 => ({ ...e2, ctaText: '' }))
                  }}
                  placeholder="Shop Now"
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                {formErrors.ctaText && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.ctaText}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">CTA Link</label>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={e => {
                    setForm(f => ({ ...f, ctaLink: e.target.value }))
                    setFormErrors(e2 => ({ ...e2, ctaLink: '' }))
                  }}
                  placeholder="/category/cakes"
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                {formErrors.ctaLink && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.ctaLink}</p>
                )}
              </div>
            </div>

            {/* 5. Secondary CTA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Secondary CTA Text (optional)</label>
                <input
                  type="text"
                  value={form.secondaryCtaText}
                  onChange={e => setForm(f => ({ ...f, secondaryCtaText: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Secondary CTA Link (optional)</label>
                <input
                  type="text"
                  value={form.secondaryCtaLink}
                  onChange={e => setForm(f => ({ ...f, secondaryCtaLink: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* 6. Badge Text */}
            <div>
              <label className="mb-1 block text-sm font-medium">Badge Text (optional)</label>
              <input
                type="text"
                value={form.badgeText}
                onChange={e => setForm(f => ({ ...f, badgeText: e.target.value }))}
                placeholder="&#127874; Same Day Available"
                className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Small pill shown on the banner above the title
              </p>
            </div>

            {/* 7. Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Text Position</label>
                <select
                  value={form.textPosition}
                  onChange={e => setForm(f => ({ ...f, textPosition: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="left">left</option>
                  <option value="right">right</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Overlay Style</label>
                <select
                  value={form.overlayStyle}
                  onChange={e => setForm(f => ({ ...f, overlayStyle: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="dark-left">dark-left</option>
                  <option value="dark-right">dark-right</option>
                  <option value="full-dark">full-dark</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {form.overlayStyle === 'dark-left' && 'Dark gradient on left (use when text is left)'}
                  {form.overlayStyle === 'dark-right' && 'Dark gradient on right (use when text is right)'}
                  {form.overlayStyle === 'full-dark' && 'Semi-transparent full overlay (for dark scene images)'}
                </p>
              </div>
            </div>

            {/* 8. Visibility */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Valid From (optional)</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Valid Until (optional)</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Leave empty to always show. Use for seasonal banners like Mother&apos;s Day.
            </p>

            {/* 9. Target City */}
            <div>
              <label className="mb-1 block text-sm font-medium">Show in City (optional)</label>
              <select
                value={form.targetCitySlug}
                onChange={e => setForm(f => ({ ...f, targetCitySlug: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-base text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                {CITY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Leave as All Cities unless this banner is city-specific
              </p>
            </div>

            {/* 10. Active Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={checked => setForm(f => ({ ...f, isActive: checked }))}
              />
              <label className="text-sm font-medium">Active — show on homepage</label>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Delete Confirmation ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the banner. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
