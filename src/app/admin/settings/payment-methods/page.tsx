"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

interface PaymentMethod {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function PaymentMethodsSettingsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payment-methods")
      const json = await res.json()
      if (json.success) {
        setMethods(json.data)
      } else {
        setError(json.error || "Failed to load payment methods")
      }
    } catch {
      setError("Failed to load payment methods")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  const openCreateDialog = () => {
    setEditingMethod(null)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method)
    setFormName(method.name)
    setFormSlug(method.slug)
    setFormDescription(method.description || "")
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("Name is required")
      return
    }
    if (!editingMethod && !formSlug.trim()) {
      setFormError("Slug is required")
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editingMethod) {
        // Update existing
        const res = await fetch(`/api/admin/payment-methods/${editingMethod.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setFormError(json.error || "Failed to update")
          return
        }
      } else {
        // Create new
        const maxSortOrder = methods.length > 0
          ? Math.max(...methods.map((m) => m.sortOrder))
          : 0
        const res = await fetch("/api/admin/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim().toLowerCase().replace(/\s+/g, "-"),
            description: formDescription.trim() || null,
            sortOrder: maxSortOrder + 1,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setFormError(json.error || "Failed to create")
          return
        }
      }
      setDialogOpen(false)
      fetchMethods()
    } catch {
      setFormError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const res = await fetch(`/api/admin/payment-methods/${method.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        fetchMethods()
      }
    } catch {
      // Ignore
    }
  }

  const handleReorder = async (method: PaymentMethod, direction: "up" | "down") => {
    const sorted = [...methods].sort((a, b) => a.sortOrder - b.sortOrder)
    const currentIndex = sorted.findIndex((m) => m.id === method.id)
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const other = sorted[swapIndex]

    // Swap sort orders
    try {
      await Promise.all([
        fetch(`/api/admin/payment-methods/${method.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: other.sortOrder }),
        }),
        fetch(`/api/admin/payment-methods/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: method.sortOrder }),
        }),
      ])
      fetchMethods()
    } catch {
      // Ignore
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => { setError(null); setLoading(true); fetchMethods() }}>
          Retry
        </Button>
      </div>
    )
  }

  const sortedMethods = [...methods].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Methods</h1>
          <p className="text-sm text-slate-500">
            Configure available payment methods for manual payment recording
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Method
        </Button>
      </div>

      <div className="space-y-2">
        {sortedMethods.map((method, index) => (
          <Card key={method.id} className="p-4">
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => handleReorder(method, "up")}
                >
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <button
                  className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30"
                  disabled={index === sortedMethods.length - 1}
                  onClick={() => handleReorder(method, "down")}
                >
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{method.name}</p>
                  <Badge variant={method.isActive ? "success" : "secondary"} className="text-[10px]">
                    {method.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">{method.slug}</span>
                </div>
                {method.description && (
                  <p className="text-sm text-slate-500 mt-0.5">{method.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(method)}
                  className="text-xs"
                >
                  {method.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(method)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {sortedMethods.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-slate-500">No payment methods configured.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openCreateDialog}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Method
            </Button>
          </Card>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method-name">Name</Label>
              <Input
                id="method-name"
                placeholder="e.g. Cash, UPI, Bank Transfer"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value)
                  if (!editingMethod) {
                    setFormSlug(generateSlug(e.target.value))
                  }
                }}
              />
            </div>
            {!editingMethod && (
              <div className="space-y-2">
                <Label htmlFor="method-slug">Slug</Label>
                <Input
                  id="method-slug"
                  placeholder="e.g. cash, upi, bank-transfer"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Unique identifier. Auto-generated from name.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="method-description">Description (optional)</Label>
              <Input
                id="method-description"
                placeholder="e.g. Cash on delivery or in person"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingMethod ? (
                "Save Changes"
              ) : (
                "Create Method"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
