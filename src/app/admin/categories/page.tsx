"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { CategoryForm } from "@/components/admin/category-form"

// ==================== Types ====================

interface CategoryNode {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  sortOrder: number
  isActive: boolean
  parentId: string | null
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string[]
  ogImage: string | null
  _count: { products: number }
  addonTemplates: Array<{
    id: string
    name: string
    description: string | null
    type: 'CHECKBOX' | 'RADIO' | 'SELECT' | 'TEXT_INPUT' | 'TEXTAREA' | 'FILE_UPLOAD'
    required: boolean
    maxLength: number | null
    placeholder: string | null
    acceptedFileTypes: string[]
    maxFileSizeMb: number | null
    sortOrder: number
    options: Array<{
      id: string
      label: string
      price: number | string
      image: string | null
      isDefault: boolean
      sortOrder: number
    }>
  }>
  children: CategoryNode[]
}

// ==================== Category Row Component ====================

function CategoryRow({
  category,
  depth,
  onEdit,
  onDelete,
}: {
  category: CategoryNode
  depth: number
  onEdit: (cat: CategoryNode) => void
  onDelete: (cat: CategoryNode) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = category.children.length > 0

  return (
    <>
      <div
        className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b ${
          !category.isActive ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${16 + depth * 32}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded p-0.5 hover:bg-slate-200"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <FolderOpen className="h-4 w-4 text-slate-400 flex-shrink-0" />

          <span className="font-medium text-sm truncate">{category.name}</span>

          {!category.isActive && (
            <Badge variant="outline" className="text-xs border-slate-200 bg-slate-50 text-slate-500">
              Inactive
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="secondary" className="text-xs">
            {category._count.products} product{category._count.products !== 1 ? 's' : ''}
          </Badge>

          {category.addonTemplates.length > 0 && (
            <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700 gap-1">
              <ClipboardList className="h-3 w-3" />
              {category.addonTemplates.length} template{category.addonTemplates.length !== 1 ? 's' : ''}
            </Badge>
          )}

          <div className="flex gap-1">
            <button
              onClick={() => onEdit(category)}
              className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        category.children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  )
}

// ==================== Main Page ====================

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      } else {
        setError(json.error || 'Failed to fetch categories')
      }
    } catch {
      setError('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Flatten categories for parent dropdown
  const flatCategories: { id: string; name: string }[] = []
  const flatten = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (!node.parentId) {
        // Only top-level categories as parent options
        flatCategories.push({ id: node.id, name: node.name })
      }
    }
  }
  flatten(categories)

  const handleCreate = () => {
    setFormMode('create')
    setEditingCategory(null)
    setFormOpen(true)
  }

  const handleEdit = (cat: CategoryNode) => {
    setFormMode('edit')
    setEditingCategory(cat)
    setFormOpen(true)
  }

  const handleDeleteClick = (cat: CategoryNode) => {
    setDeleteTarget(cat)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setDeleteTarget(null)
        fetchCategories()
      } else {
        setDeleteError(json.error || 'Failed to delete category')
      }
    } catch {
      setDeleteError('Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  // Count total categories including children
  const countAll = (nodes: CategoryNode[]): number => {
    let count = 0
    for (const n of nodes) {
      count += 1 + countAll(n.children)
    }
    return count
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            {countAll(categories)} categories total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No categories yet</h3>
          <p className="text-sm text-slate-500 mb-4">
            Create your first category to get started.
          </p>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      )}

      {/* Category tree */}
      {!loading && categories.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span className="pl-11">Category</span>
            <span className="pr-16">Info</span>
          </div>

          {/* Tree rows */}
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              depth={0}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Category</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              {deleteTarget._count.products > 0 && (
                <span className="block mt-2 text-amber-600">
                  This category has {deleteTarget._count.products} active product{deleteTarget._count.products !== 1 ? 's' : ''}.
                  Categories with active products cannot be deleted.
                </span>
              )}
            </p>
            {deleteError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="gap-2"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Form Sheet */}
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={editingCategory ? {
          id: editingCategory.id,
          name: editingCategory.name,
          slug: editingCategory.slug,
          description: editingCategory.description,
          image: editingCategory.image,
          parentId: editingCategory.parentId,
          sortOrder: editingCategory.sortOrder,
          isActive: editingCategory.isActive,
          metaTitle: editingCategory.metaTitle,
          metaDescription: editingCategory.metaDescription,
          metaKeywords: editingCategory.metaKeywords,
          ogImage: editingCategory.ogImage,
          _count: editingCategory._count,
          addonTemplates: editingCategory.addonTemplates,
        } : undefined}
        parentOptions={flatCategories}
        onSaved={fetchCategories}
      />
    </div>
  )
}
