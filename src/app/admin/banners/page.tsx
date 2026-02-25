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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { LayersPanel } from '@/components/admin/layers-panel'
import { BannerCanvas } from '@/components/admin/banner-canvas'
import { PropertiesPanel } from '@/components/admin/properties-panel'
import {
  Dialog,
  DialogContent,
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
import {
  type Layer,
  type LayerType,
  type TextLayer,
  type BackgroundLayer,
  type ButtonLayer,
  generateId,
  loadGoogleFont,
  migrateOldBannerToLayers,
  createBackgroundLayer,
  createImageLayer,
  createTextLayer,
  createShapeLayer,
  createBadgeLayer,
  createButtonLayer,
} from '@/lib/banner-layers'

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
  contentWidth: string
  titleSize: string
  subtitleSize: string
  verticalAlign: string
  heroSize: string
  contentPadding: string
  contentX: number
  contentY: number
  contentW: number
  contentH: number
  heroX: number
  heroY: number
  heroW: number
  heroH: number
  contentLockRatio: boolean
  heroLockRatio: boolean
  ctaBgColor: string | null
  ctaTextColor: string | null
  ctaBorderColor: string | null
  badgeBgColor: string | null
  badgeTextColor: string | null
  createdAt: string
  updatedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layers?: any[]
}

const THEME_SWATCHES: { value: string; color: string; label: string }[] = [
  { value: 'blush', color: '#fce4ec', label: 'Blush' },
  { value: 'purple', color: '#ede7f6', label: 'Purple' },
  { value: 'gold', color: '#fff8e1', label: 'Gold' },
  { value: 'navy', color: '#1a237e', label: 'Navy' },
  { value: 'mint', color: '#e8f5e9', label: 'Mint' },
  { value: 'peach', color: '#fff3e0', label: 'Peach' },
]

// ==================== Component ====================

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [saving, setSaving] = useState(false)

  // Layer editor state
  const [formLayers, setFormLayers] = useState<Layer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [canvasMode, setCanvasMode] = useState<'edit' | 'preview'>('edit')
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [previewRatio, setPreviewRatio] = useState('16/5')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    const defaultLayers: Layer[] = [
      createBackgroundLayer(),
    ]
    setFormLayers(defaultLayers)
    setSelectedLayerId(null)
    setCanvasMode('edit')
    setModalOpen(true)
  }

  const openEditModal = (banner: Banner) => {
    let layers: Layer[]
    if (banner.layers && Array.isArray(banner.layers) && banner.layers.length > 0) {
      layers = banner.layers as Layer[]
    } else {
      layers = migrateOldBannerToLayers(banner as unknown as Record<string, unknown>)
    }
    // Load all fonts used in this banner
    layers.forEach(l => {
      if ('fontFamily' in l) loadGoogleFont((l as { fontFamily: string }).fontFamily)
    })
    setFormLayers(layers)
    setSelectedLayerId(null)
    setEditingBanner(banner)
    setCanvasMode('edit')
    setModalOpen(true)
  }

  // ==================== Layer Handlers ====================

  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    setFormLayers(prev =>
      prev.map(l => l.id === id ? ({ ...l, ...updates } as Layer) : l)
    )
  }

  const handleAddLayer = (type: LayerType) => {
    let newLayer: Layer
    switch (type) {
      case 'image': newLayer = createImageLayer(); break
      case 'text': newLayer = createTextLayer(); break
      case 'shape': newLayer = createShapeLayer(); break
      case 'badge': newLayer = createBadgeLayer(); break
      case 'button': newLayer = createButtonLayer(); break
      default: return
    }
    const maxZ = Math.max(0, ...formLayers.map(l => l.zIndex))
    newLayer.zIndex = maxZ + 10
    setFormLayers(prev => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  const handleDeleteLayer = (id: string) => {
    const layer = formLayers.find(l => l.id === id)
    if (layer?.type === 'background') return
    setFormLayers(prev => prev.filter(l => l.id !== id))
    if (selectedLayerId === id) setSelectedLayerId(null)
  }

  const handleDuplicateLayer = (id: string) => {
    const layer = formLayers.find(l => l.id === id)
    if (!layer) return
    const maxZ = Math.max(0, ...formLayers.map(l => l.zIndex))
    const duplicate: Layer = {
      ...layer,
      id: generateId(),
      name: `${layer.name} copy`,
      x: layer.x + 2,
      y: layer.y + 2,
      zIndex: maxZ + 10,
    } as Layer
    setFormLayers(prev => [...prev, duplicate])
    setSelectedLayerId(duplicate.id)
  }

  const handleToggleVisible = (id: string) => {
    setFormLayers(prev =>
      prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
    )
  }

  const handleToggleLocked = (id: string) => {
    setFormLayers(prev =>
      prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
    )
  }

  // ==================== Save ====================

  const handleSave = async () => {
    setSaving(true)
    try {
      // Extract backward-compatible fields from layers
      const bgLayer = formLayers.find(l => l.type === 'background') as BackgroundLayer | undefined
      const titleLayer = formLayers.find(l => l.type === 'text' && l.name === 'Title') as TextLayer | undefined
      const subtitleLayer = formLayers.find(l => l.type === 'text' && l.name === 'Subtitle') as TextLayer | undefined
      const ctaLayer = formLayers.find(l => l.type === 'button') as ButtonLayer | undefined
      const imageLayer = formLayers.find(l => l.type === 'image')
      const badgeLayer = formLayers.find(l => l.type === 'badge')

      const payload: Record<string, unknown> = {
        layers: formLayers,
        // Backward-compat fields for homepage rendering (Phase 4 migration)
        imageUrl: bgLayer?.imageUrl || '',
        titleHtml: titleLayer?.html || '',
        subtitleHtml: subtitleLayer?.html || null,
        ctaText: ctaLayer?.text || 'Shop Now',
        ctaLink: ctaLayer?.href || '/',
        ctaBgColor: ctaLayer?.bgColor || '#E91E63',
        ctaTextColor: ctaLayer?.textColor || '#FFFFFF',
        subjectImageUrl: imageLayer && 'imageUrl' in imageLayer ? (imageLayer as { imageUrl: string }).imageUrl : null,
        badgeText: badgeLayer && 'text' in badgeLayer ? (badgeLayer as { text: string }).text : null,
        badgeBgColor: badgeLayer && 'bgColor' in badgeLayer ? (badgeLayer as { bgColor: string }).bgColor : 'rgba(255,255,255,0.2)',
        badgeTextColor: badgeLayer && 'textColor' in badgeLayer ? (badgeLayer as { textColor: string }).textColor : '#FFFFFF',
        overlayStyle: formLayers.some(l => l.type === 'shape') ? 'dark-left' : 'none',
        textPosition: 'left',
        isActive: editingBanner?.isActive ?? true,
      }

      const url = editingBanner?.id
        ? `/api/admin/banners/${editingBanner.id}`
        : '/api/admin/banners'
      const method = editingBanner?.id ? 'PATCH' : 'POST'

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
            Manage homepage banners with the layer-based canvas editor
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
              <GripVertical className="h-5 w-5 shrink-0 text-slate-300" />

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

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      backgroundColor: THEME_SWATCHES.find(s => s.value === banner.theme)?.color || '#fce4ec',
                      border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0, display: 'inline-block',
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
                  {banner.layers && Array.isArray(banner.layers) && banner.layers.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {banner.layers.length} layers
                    </Badge>
                  )}
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

              <div className="flex shrink-0 items-center gap-2">
                {(banner.validFrom || banner.validUntil) && (
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {banner.validFrom ? formatDate(banner.validFrom) : '...'}
                    {' – '}
                    {banner.validUntil ? formatDate(banner.validUntil) : '...'}
                  </span>
                )}

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

                <Switch
                  checked={Boolean(banner.isActive)}
                  onCheckedChange={() => handleToggleActive(banner)}
                />

                <Button variant="outline" size="sm" onClick={() => openEditModal(banner)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

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

      {/* ==================== Layer Canvas Modal ==================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] w-full overflow-hidden p-0">
          <DialogDescription className="sr-only">
            {editingBanner ? 'Edit banner layers' : 'Create new banner with layers'}
          </DialogDescription>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingBanner ? 'Edit Banner' : 'Create New Banner'}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Banner'}
              </Button>
            </div>
          </div>

          {/* Three-panel layout */}
          <div className="flex h-[80vh] overflow-hidden">
            {/* Left: Layers panel */}
            <div className="w-56 flex-shrink-0 border-r overflow-y-auto">
              <LayersPanel
                layers={formLayers}
                selectedId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onReorder={setFormLayers}
                onToggleVisible={handleToggleVisible}
                onToggleLocked={handleToggleLocked}
                onDelete={handleDeleteLayer}
                onDuplicate={handleDuplicateLayer}
                onAddLayer={handleAddLayer}
              />
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <BannerCanvas
                layers={formLayers}
                selectedId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onUpdateLayer={handleUpdateLayer}
                onDeleteLayer={handleDeleteLayer}
                mode={canvasMode}
                onModeChange={setCanvasMode}
                snapToGrid={snapToGrid}
                onSnapToGridChange={setSnapToGrid}
                aspectRatio={previewRatio}
                onAspectRatioChange={setPreviewRatio}
              />
            </div>

            {/* Right: Properties */}
            <div className="w-72 flex-shrink-0 border-l overflow-y-auto">
              <PropertiesPanel
                layer={formLayers.find(l => l.id === selectedLayerId) ?? null}
                onUpdate={(updates) => {
                  if (selectedLayerId) handleUpdateLayer(selectedLayerId, updates)
                }}
              />
            </div>
          </div>
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
