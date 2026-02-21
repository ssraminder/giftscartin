"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, X as XIcon } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface CategoryOption {
  id: string
  name: string
  slug: string
  parentId: string | null
}

interface ProductListItem {
  id: string
  name: string
  slug: string
  basePrice: number
  isActive: boolean
  isSameDayEligible: boolean
  images: string[]
  category: { id: string; name: string; slug: string }
}

interface ProductFullData {
  id: string
  name: string
  slug: string
  description: string | null
  shortDesc: string | null
  categoryId: string
  basePrice: number | string
  images: string[]
  tags: string[]
  occasion: string[]
  weight: string | null
  isVeg: boolean
  isActive: boolean
  isSameDayEligible: boolean
}

interface ProductFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductListItem | null
  categories: CategoryOption[]
  onSaved: () => void
}

const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Valentine",
  "Diwali",
  "Rakhi",
  "Holi",
  "Just Because",
]

export function ProductFormDrawer({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: ProductFormDrawerProps) {
  const isEditing = !!product

  // Form state
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [categoryId, setCategoryId] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [description, setDescription] = useState("")
  const [shortDesc, setShortDesc] = useState("")
  const [weight, setWeight] = useState("")
  const [isVeg, setIsVeg] = useState(true)
  const [isSameDayEligible, setIsSameDayEligible] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [images, setImages] = useState<string[]>([""])

  const [saving, setSaving] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const populateForm = (data: ProductFullData) => {
    setName(data.name)
    setSlug(data.slug)
    setSlugTouched(true)
    setCategoryId(data.categoryId)
    setBasePrice(String(Number(data.basePrice)))
    setDescription(data.description || "")
    setShortDesc(data.shortDesc || "")
    setWeight(data.weight || "")
    setIsVeg(data.isVeg)
    setIsSameDayEligible(data.isSameDayEligible)
    setIsActive(data.isActive)
    setSelectedOccasions(data.occasion || [])
    setTags(data.tags || [])
    setTagInput("")
    setImages(data.images?.length > 0 ? data.images : [""])
  }

  const resetForm = () => {
    setName("")
    setSlug("")
    setSlugTouched(false)
    setCategoryId("")
    setBasePrice("")
    setDescription("")
    setShortDesc("")
    setWeight("")
    setIsVeg(true)
    setIsSameDayEligible(false)
    setIsActive(true)
    setSelectedOccasions([])
    setTags([])
    setTagInput("")
    setImages([""])
  }

  // Reset form when product changes or drawer opens
  useEffect(() => {
    if (open) {
      setToast(null)
      if (product) {
        // Fetch full product data for editing
        setLoadingProduct(true)
        fetch(`/api/admin/products/${product.id}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              populateForm(json.data)
            } else {
              // Fallback to list item data
              setName(product.name)
              setSlug(product.slug)
              setSlugTouched(true)
              setCategoryId(product.category.id)
              setBasePrice(String(product.basePrice))
              setIsActive(product.isActive)
              setIsSameDayEligible(product.isSameDayEligible)
              setImages(product.images?.length > 0 ? product.images : [""])
            }
          })
          .catch(() => {
            // Fallback
            setName(product.name)
            setSlug(product.slug)
            setSlugTouched(true)
            setCategoryId(product.category.id)
            setBasePrice(String(product.basePrice))
            setIsActive(product.isActive)
            setIsSameDayEligible(product.isSameDayEligible)
            setImages(product.images?.length > 0 ? product.images : [""])
          })
          .finally(() => setLoadingProduct(false))
      } else {
        resetForm()
      }
    }
  }, [open, product])

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugTouched && name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
      setSlug(generated)
    }
  }, [name, slugTouched])

  const priceNum = parseFloat(basePrice) || 0
  const recommendedVendorCost = Math.round(priceNum * 0.72)

  const toggleOccasion = (occ: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occ) ? prev.filter((o) => o !== occ) : [...prev, occ]
    )
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      const trimmed = tagInput.trim()
      if (!tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed])
      }
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const addImageInput = () => {
    if (images.length < 5) {
      setImages((prev) => [...prev, ""])
    }
  }

  const updateImage = (index: number, value: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? value : img)))
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      showToast("error", "Product name is required")
      return
    }
    if (!categoryId) {
      showToast("error", "Category is required")
      return
    }
    if (!basePrice || priceNum <= 0) {
      showToast("error", "Price must be greater than 0")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        categoryId,
        basePrice: priceNum,
        description: description.trim() || null,
        shortDesc: shortDesc.trim() || null,
        weight: weight.trim() || null,
        isVeg,
        isSameDayEligible,
        isActive,
        occasion: selectedOccasions,
        tags,
        images: images.filter((img) => img.trim()),
      }

      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (json.success) {
        showToast("success", isEditing ? "Product updated" : "Product created")
        onSaved()
        onOpenChange(false)
      } else {
        showToast("error", json.error || "Failed to save product")
      }
    } catch {
      showToast("error", "Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>{isEditing ? "Edit Product" : "Add Product"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update product details below." : "Fill in the product details below."}
          </SheetDescription>
        </SheetHeader>

        {/* Toast */}
        {toast && (
          <div
            className={`mx-6 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Scrollable form */}
        {loadingProduct ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="product-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g. Chocolate Truffle Cake"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="product-slug">Slug</Label>
            <Input
              id="product-slug"
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSlug(e.target.value)
                setSlugTouched(true)
              }}
              placeholder="auto-generated-from-name"
            />
            {!slugTouched && (
              <p className="text-xs text-slate-400">Auto-generated from name</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="product-category">
              Category <span className="text-red-500">*</span>
            </Label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select category</option>
              {categories
                .filter((c) => !c.parentId)
                .map((parent) => {
                  const children = categories.filter(
                    (c) => c.parentId === parent.id
                  )
                  return [
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>,
                    ...children.map((child) => (
                      <option key={child.id} value={child.id}>
                        &nbsp;&nbsp;{child.name}
                      </option>
                    )),
                  ]
                })}
            </select>
          </div>

          {/* Customer Selling Price */}
          <div className="space-y-1.5">
            <Label htmlFor="product-price">
              Customer Selling Price ₹ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasePrice(e.target.value)}
              placeholder="0.00"
            />
            {priceNum > 0 && (
              <p className="text-xs text-slate-400">
                Recommended max vendor cost: {formatPrice(recommendedVendorCost)}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="product-desc">Description</Label>
            <textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Product description..."
            />
          </div>

          {/* Short Description */}
          <div className="space-y-1.5">
            <Label htmlFor="product-short-desc">Short Description</Label>
            <textarea
              id="product-short-desc"
              value={shortDesc}
              onChange={(e) => {
                if (e.target.value.length <= 150) setShortDesc(e.target.value)
              }}
              rows={2}
              maxLength={150}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Brief product summary..."
            />
            <p className="text-xs text-slate-400 text-right">
              {shortDesc.length}/150
            </p>
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="product-weight">Weight</Label>
            <Input
              id="product-weight"
              value={weight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
              placeholder="e.g. 1kg, 500g"
            />
          </div>

          {/* Toggle — Is Veg */}
          <div className="flex items-center justify-between">
            <Label htmlFor="product-veg">Vegetarian Product</Label>
            <button
              id="product-veg"
              type="button"
              role="switch"
              aria-checked={isVeg}
              onClick={() => setIsVeg(!isVeg)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isVeg ? "bg-[#E91E63]" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  isVeg ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle — Same Day Eligible */}
          <div className="flex items-center justify-between">
            <Label htmlFor="product-sameday">Available for Same Day Delivery</Label>
            <button
              id="product-sameday"
              type="button"
              role="switch"
              aria-checked={isSameDayEligible}
              onClick={() => setIsSameDayEligible(!isSameDayEligible)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isSameDayEligible ? "bg-[#E91E63]" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  isSameDayEligible ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle — Is Active */}
          <div className="flex items-center justify-between">
            <Label htmlFor="product-active">Active / Visible to customers</Label>
            <button
              id="product-active"
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? "bg-[#E91E63]" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Occasion multi-select chips */}
          <div className="space-y-1.5">
            <Label>Occasion</Label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((occ) => {
                const selected = selectedOccasions.includes(occ)
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => toggleOccasion(occ)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selected
                        ? "bg-[#E91E63] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {occ}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="product-tags">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Input
              id="product-tags"
              value={tagInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type tag + press Enter"
            />
          </div>

          {/* Images */}
          <div className="space-y-1.5">
            <Label>Images</Label>
            <div className="space-y-2">
              {images.map((img, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={img}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateImage(i, e.target.value)}
                    placeholder={`Image URL ${i + 1}`}
                    className="flex-1"
                  />
                  {images.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeImage(i)}
                      className="shrink-0"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {images.length < 5 && (
              <button
                type="button"
                onClick={addImageInput}
                className="text-sm text-[#E91E63] hover:underline flex items-center gap-1 mt-1"
              >
                <Plus className="h-3 w-3" /> Add Image URL
              </button>
            )}
          </div>
        </div>
        )}

        {/* Sticky footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
