"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  X,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuNode {
  id: string
  label: string
  slug: string | null
  href: string | null
  icon: string | null
  isVisible: boolean
  itemType: string
  sortOrder: number
  children: MenuNode[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MenuManager() {
  const [menuTree, setMenuTree] = useState<MenuNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [addingTo, setAddingTo] = useState<string | null>(null) // parent id or "__root__"
  const [addLabel, setAddLabel] = useState("")
  const [addHref, setAddHref] = useState("")
  const [addType, setAddType] = useState("link")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editHref, setEditHref] = useState("")

  // ─── Data Fetching ─────────────────────────────────────────────────────

  const fetchMenu = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/admin/menu")
      const json = await res.json()
      if (json.success) {
        setMenuTree(json.data)
      } else {
        setError(json.error || "Failed to load menu")
      }
    } catch {
      setError("Failed to load menu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  // ─── Toggle Visibility ─────────────────────────────────────────────────

  async function toggleVisibility(id: string, currentVisible: boolean) {
    // Optimistic update
    setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: !currentVisible }))

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id, isVisible: !currentVisible }] }),
      })
      const json = await res.json()
      if (!json.success) {
        // Revert on failure
        setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: currentVisible }))
      }
    } catch {
      setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: currentVisible }))
    }
  }

  // ─── Inline Edit ───────────────────────────────────────────────────────

  function startEdit(node: MenuNode) {
    setEditingId(node.id)
    setEditLabel(node.label)
    setEditHref(node.href || "")
  }

  async function saveEdit(id: string) {
    if (!editLabel.trim()) return
    setSaving(true)
    try {
      const updates: { id: string; label?: string; href?: string }[] = [{ id }]
      const node = findNodeInTree(menuTree, id)
      if (node && editLabel.trim() !== node.label) {
        updates[0].label = editLabel.trim()
      }
      if (node && editHref !== (node.href || "")) {
        updates[0].href = editHref
      }
      if (Object.keys(updates[0]).length > 1) {
        const res = await fetch("/api/admin/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        })
        const json = await res.json()
        if (json.success) {
          setMenuTree((prev) =>
            updateNodeInTree(prev, id, {
              label: editLabel.trim(),
              href: editHref || null,
            })
          )
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
      setEditingId(null)
    }
  }

  // ─── Create New Item ───────────────────────────────────────────────────

  async function handleCreate() {
    if (!addLabel.trim()) return
    setSaving(true)
    try {
      const parentId = addingTo === "__root__" ? undefined : addingTo ?? undefined
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          label: addLabel.trim(),
          href: addHref.trim() || undefined,
          itemType: addType,
        }),
      })
      const json = await res.json()
      if (json.success) {
        // Refetch to get proper tree
        await fetchMenu()
        setAddingTo(null)
        setAddLabel("")
        setAddHref("")
        setAddType("link")
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete Item ───────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/menu?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setMenuTree((prev) => removeNodeFromTree(prev, id))
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Expand/Collapse ──────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Type Badge ────────────────────────────────────────────────────────

  function typeBadge(itemType: string) {
    const map: Record<string, { label: string; cls: string }> = {
      top_level: { label: "TOP LEVEL", cls: "bg-gray-100 text-gray-600" },
      category_group: { label: "GROUP", cls: "bg-blue-50 text-blue-600" },
      link: { label: "LINK", cls: "bg-green-50 text-green-600" },
      occasion: { label: "OCCASION", cls: "bg-purple-50 text-purple-600" },
      featured: { label: "FEATURED", cls: "bg-pink-50 text-pink-600" },
    }
    const badge = map[itemType] || { label: itemType.toUpperCase(), cls: "bg-gray-100 text-gray-600" }
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badge.cls}`}>
        {badge.label}
      </span>
    )
  }

  // ─── Render Menu Item Row ──────────────────────────────────────────────

  function renderNode(node: MenuNode, depth: number = 0) {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children.length > 0
    const isEditing = editingId === node.id
    const isHidden = !node.isVisible

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2.5 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
            isHidden ? "opacity-40" : ""
          }`}
          style={{ paddingLeft: `${depth * 32 + 12}px` }}
        >
          {/* Drag handle (visual only) */}
          <GripVertical className="h-4 w-4 text-gray-300 cursor-grab shrink-0" />

          {/* Visibility toggle */}
          <button
            onClick={() => toggleVisibility(node.id, node.isVisible)}
            className={`shrink-0 p-1 rounded transition-colors ${
              node.isVisible
                ? "text-green-600 hover:bg-green-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
            title={node.isVisible ? "Click to hide" : "Click to show"}
          >
            {node.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          {/* Expand/collapse for items with children */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="shrink-0 p-0.5 rounded hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          {/* Label (editable) */}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-7 px-2 border border-gray-300 rounded text-sm text-base flex-1 min-w-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(node.id)
                  if (e.key === "Escape") setEditingId(null)
                }}
              />
              {(node.itemType === "link" || node.itemType === "occasion") && (
                <input
                  type="text"
                  value={editHref}
                  onChange={(e) => setEditHref(e.target.value)}
                  placeholder="/category/slug"
                  className="h-7 px-2 border border-gray-300 rounded text-sm text-base w-48"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(node.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                />
              )}
              <button
                onClick={() => saveEdit(node.id)}
                disabled={saving}
                className="text-xs text-green-600 font-medium hover:underline"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <span
              onClick={() => startEdit(node)}
              className={`text-sm cursor-pointer hover:text-pink-600 flex-1 min-w-0 truncate ${
                isHidden ? "italic line-through" : "font-medium text-gray-800"
              }`}
              title="Click to edit"
            >
              {node.icon && <span className="mr-1">{node.icon}</span>}
              {node.label}
            </span>
          )}

          {/* Href display for links */}
          {!isEditing && node.href && (
            <span className="text-xs text-gray-400 truncate max-w-[200px] hidden sm:inline">
              {node.href}
            </span>
          )}

          {/* Type badge */}
          {typeBadge(node.itemType)}

          {/* Add subgroup/child */}
          {(node.itemType === "top_level" || node.itemType === "category_group") && (
            <button
              onClick={() => {
                setAddingTo(node.id)
                setAddType(node.itemType === "top_level" ? "category_group" : "link")
                setAddLabel("")
                setAddHref("")
                if (!expandedIds.has(node.id)) toggleExpand(node.id)
              }}
              className="text-xs text-pink-600 font-medium hover:underline shrink-0"
            >
              <Plus className="h-3 w-3 inline mr-0.5" />
              Add
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`Delete "${node.label}"${hasChildren ? " and all its children" : ""}?`)) {
                handleDelete(node.id)
              }
            }}
            disabled={deletingId === node.id}
            className="text-xs text-red-500 hover:text-red-700 shrink-0 p-1"
            title="Delete"
          >
            {deletingId === node.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}

        {/* Inline add form for this parent */}
        {addingTo === node.id && isExpanded && (
          <div
            className="flex items-center gap-2 py-2.5 px-3 bg-pink-50 border-b border-pink-100"
            style={{ paddingLeft: `${(depth + 1) * 32 + 12}px` }}
          >
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Label"
              className="h-7 px-2 border border-gray-300 rounded text-sm text-base flex-1 min-w-0 max-w-[200px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") setAddingTo(null)
              }}
            />
            <input
              type="text"
              value={addHref}
              onChange={(e) => setAddHref(e.target.value)}
              placeholder="/category/slug"
              className="h-7 px-2 border border-gray-300 rounded text-sm text-base w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") setAddingTo(null)
              }}
            />
            <button
              onClick={handleCreate}
              disabled={saving || !addLabel.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-pink-600 text-white text-xs font-medium hover:bg-pink-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </button>
            <button
              onClick={() => setAddingTo(null)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchMenu}
          className="mt-2 text-sm text-pink-600 font-medium hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg text-gray-900">Navigation Menu</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            Changes apply immediately
          </span>
        </div>
        <button
          onClick={() => {
            setAddingTo("__root__")
            setAddType("top_level")
            setAddLabel("")
            setAddHref("")
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Top-Level Item
        </button>
      </div>

      {/* Root-level add form */}
      {addingTo === "__root__" && (
        <div className="flex items-center gap-2 p-3 bg-pink-50 border-b border-pink-100">
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Label"
            className="h-8 px-2 border border-gray-300 rounded text-sm text-base flex-1 min-w-0 max-w-[200px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
              if (e.key === "Escape") setAddingTo(null)
            }}
          />
          <input
            type="text"
            value={addHref}
            onChange={(e) => setAddHref(e.target.value)}
            placeholder="/category/slug (optional)"
            className="h-8 px-2 border border-gray-300 rounded text-sm text-base w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
              if (e.key === "Escape") setAddingTo(null)
            }}
          />
          <button
            onClick={handleCreate}
            disabled={saving || !addLabel.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-pink-600 text-white text-xs font-medium hover:bg-pink-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
          <button
            onClick={() => setAddingTo(null)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Menu tree */}
      <div>
        {menuTree.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No menu items yet. Click &quot;Add Top-Level Item&quot; to get started.
          </div>
        ) : (
          menuTree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  )
}

// ─── Tree Helpers ────────────────────────────────────────────────────────────

function updateNodeInTree(
  nodes: MenuNode[],
  id: string,
  updates: Partial<MenuNode>
): MenuNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, ...updates }
    }
    if (node.children.length > 0) {
      return { ...node, children: updateNodeInTree(node.children, id, updates) }
    }
    return node
  })
}

function removeNodeFromTree(nodes: MenuNode[], id: string): MenuNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeNodeFromTree(node.children, id),
    }))
}

function findNodeInTree(nodes: MenuNode[], id: string): MenuNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}
