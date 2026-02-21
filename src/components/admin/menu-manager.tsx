"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  X,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

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

interface ToastState {
  message: string
  type: "success" | "error"
}

// ─── Occasion Presets ────────────────────────────────────────────────────────

const OCCASION_PRESETS = [
  { icon: "\uD83C\uDF82", label: "Birthday" },
  { icon: "\uD83D\uDC8D", label: "Anniversary" },
  { icon: "\uD83D\uDC9D", label: "Valentine's Day" },
  { icon: "\uD83D\uDC69", label: "Mother's Day" },
  { icon: "\uD83D\uDC68", label: "Father's Day" },
  { icon: "\uD83C\uDF93", label: "Graduation" },
  { icon: "\uD83D\uDC90", label: "Farewell" },
  { icon: "\uD83D\uDC76", label: "Baby Shower" },
  { icon: "\uD83D\uDCBC", label: "Corporate" },
  { icon: "\uD83E\uDEAA", label: "Diwali" },
  { icon: "\uD83C\uDF84", label: "Christmas" },
  { icon: "\uD83C\uDF8A", label: "New Year" },
  { icon: "\uD83C\uDF39", label: "Rose Day" },
  { icon: "\uD83D\uDC6B", label: "Friendship Day" },
  { icon: "\uD83C\uDFEB", label: "Teachers Day" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function MenuManager() {
  const [menuTree, setMenuTree] = useState<MenuNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Add top-level dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [dialogLabel, setDialogLabel] = useState("")
  const [dialogSlug, setDialogSlug] = useState("")
  const [dialogIcon, setDialogIcon] = useState("")
  const [dialogVisible, setDialogVisible] = useState(true)
  const [dialogSaving, setDialogSaving] = useState(false)

  // Inline add forms (subgroup/link)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addLabel, setAddLabel] = useState("")
  const [addHref, setAddHref] = useState("")
  const [addType, setAddType] = useState("link")
  const [addSaving, setAddSaving] = useState(false)

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<"label" | "href">("label")
  const [editValue, setEditValue] = useState("")
  const [, setEditSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sort saving
  const [sortingId, setSortingId] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  function showToast(message: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

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

  // ─── Slug Generation ───────────────────────────────────────────────────

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  // ─── Toggle Visibility ─────────────────────────────────────────────────

  async function toggleVisibility(id: string, currentVisible: boolean) {
    setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: !currentVisible }))
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isVisible: !currentVisible }),
      })
      const json = await res.json()
      if (!json.success) {
        setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: currentVisible }))
        showToast("Failed to update visibility", "error")
      }
    } catch {
      setMenuTree((prev) => updateNodeInTree(prev, id, { isVisible: currentVisible }))
      showToast("Failed to update visibility", "error")
    }
  }

  // ─── Add Top-Level Item (Dialog) ───────────────────────────────────────

  function openAddDialog() {
    setDialogLabel("")
    setDialogSlug("")
    setDialogIcon("")
    setDialogVisible(true)
    setShowAddDialog(true)
  }

  async function handleAddTopLevel() {
    if (!dialogLabel.trim()) return
    setDialogSaving(true)
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: dialogLabel.trim(),
          slug: dialogSlug.trim() || generateSlug(dialogLabel),
          icon: dialogIcon.trim() || undefined,
          isVisible: dialogVisible,
          itemType: "top_level",
          sortOrder: menuTree.length + 1,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchMenu()
        setShowAddDialog(false)
        showToast("Menu item added")
      } else {
        showToast(json.error || "Failed to add item", "error")
      }
    } catch {
      showToast("Failed to add item", "error")
    } finally {
      setDialogSaving(false)
    }
  }

  // ─── Add Subgroup / Link (Inline) ─────────────────────────────────────

  function startAddChild(parentId: string, type: string) {
    setAddingTo(parentId)
    setAddType(type)
    setAddLabel("")
    setAddHref("")
    if (!expandedIds.has(parentId)) toggleExpand(parentId)
  }

  async function handleAddChild() {
    if (!addLabel.trim()) return
    setAddSaving(true)
    try {
      const body: Record<string, unknown> = {
        parentId: addingTo,
        label: addLabel.trim(),
        itemType: addType,
      }
      if (addType === "link" && addHref.trim()) {
        body.href = addHref.trim()
      }
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        await fetchMenu()
        setAddingTo(null)
        showToast("Item added")
      } else {
        showToast(json.error || "Failed to add item", "error")
      }
    } catch {
      showToast("Failed to add item", "error")
    } finally {
      setAddSaving(false)
    }
  }

  // ─── Inline Edit ───────────────────────────────────────────────────────

  function startEditLabel(node: MenuNode) {
    setEditingId(node.id)
    setEditField("label")
    setEditValue(node.label)
  }

  function startEditHref(node: MenuNode) {
    setEditingId(node.id)
    setEditField("href")
    setEditValue(node.href || "")
  }

  async function saveEdit() {
    if (!editingId) return
    if (editField === "label" && !editValue.trim()) return
    setEditSaving(true)
    try {
      const body: Record<string, unknown> = { id: editingId }
      if (editField === "label") body.label = editValue.trim()
      else body.href = editValue.trim()

      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setMenuTree((prev) =>
          updateNodeInTree(prev, editingId!, {
            ...(editField === "label" ? { label: editValue.trim() } : { href: editValue.trim() || null }),
          })
        )
        setSavedId(editingId)
        setTimeout(() => setSavedId(null), 1500)
      } else {
        showToast("Failed to save", "error")
      }
    } catch {
      showToast("Failed to save", "error")
    } finally {
      setEditSaving(false)
      setEditingId(null)
    }
  }

  // ─── Sort Order (Up/Down) ──────────────────────────────────────────────

  async function swapSortOrder(parentId: string | null, index: number, direction: "up" | "down") {
    const siblings = parentId ? findNodeInTree(menuTree, parentId)?.children ?? [] : menuTree
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const itemA = siblings[index]
    const itemB = siblings[targetIndex]
    const sortA = itemA.sortOrder
    const sortB = itemB.sortOrder

    // Optimistic swap
    setSortingId(itemA.id)
    setMenuTree((prev) => {
      let updated = updateNodeInTree(prev, itemA.id, { sortOrder: sortB })
      updated = updateNodeInTree(updated, itemB.id, { sortOrder: sortA })
      return sortTree(updated)
    })

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            { id: itemA.id, sortOrder: sortB },
            { id: itemB.id, sortOrder: sortA },
          ],
        }),
      })
      const json = await res.json()
      if (!json.success) {
        // Revert
        setMenuTree((prev) => {
          let updated = updateNodeInTree(prev, itemA.id, { sortOrder: sortA })
          updated = updateNodeInTree(updated, itemB.id, { sortOrder: sortB })
          return sortTree(updated)
        })
        showToast("Failed to reorder", "error")
      }
    } catch {
      setMenuTree((prev) => {
        let updated = updateNodeInTree(prev, itemA.id, { sortOrder: sortA })
        updated = updateNodeInTree(updated, itemB.id, { sortOrder: sortB })
        return sortTree(updated)
      })
      showToast("Failed to reorder", "error")
    } finally {
      setSortingId(null)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/menu?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setMenuTree((prev) => removeNodeFromTree(prev, id))
        setConfirmDeleteId(null)
        showToast("Deleted")
      } else {
        showToast("Failed to delete", "error")
      }
    } catch {
      showToast("Failed to delete", "error")
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

  // ─── Find Sibling Index ────────────────────────────────────────────────

  function findSiblingInfo(nodeId: string): { parentId: string | null; index: number; total: number } | null {
    // Check root
    const rootIdx = menuTree.findIndex((n) => n.id === nodeId)
    if (rootIdx !== -1) return { parentId: null, index: rootIdx, total: menuTree.length }

    // Search children recursively
    function search(nodes: MenuNode[]): { parentId: string; index: number; total: number } | null {
      for (const node of nodes) {
        const idx = node.children.findIndex((c) => c.id === nodeId)
        if (idx !== -1) return { parentId: node.id, index: idx, total: node.children.length }
        const found = search(node.children)
        if (found) return found
      }
      return null
    }
    return search(menuTree)
  }

  // ─── Render Menu Item Row ──────────────────────────────────────────────

  function renderNode(node: MenuNode, depth: number = 0) {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children.length > 0
    const isHidden = !node.isVisible
    const isEditingLabel = editingId === node.id && editField === "label"
    const isEditingHref = editingId === node.id && editField === "href"
    const isConfirmingDelete = confirmDeleteId === node.id
    const justSaved = savedId === node.id

    const siblingInfo = findSiblingInfo(node.id)
    const isFirst = siblingInfo?.index === 0
    const isLast = siblingInfo ? siblingInfo.index === siblingInfo.total - 1 : true

    return (
      <div key={node.id}>
        {/* Delete confirmation bar */}
        {isConfirmingDelete && (
          <div
            className="flex items-center gap-2 py-2 px-3 bg-red-50 border-b border-red-200 text-sm"
            style={{ paddingLeft: `${depth * 32 + 12}px` }}
          >
            <span className="text-red-700">
              Delete &apos;{node.label}&apos;?{hasChildren ? " This removes all sub-items too." : ""}
            </span>
            <button
              onClick={() => handleDelete(node.id)}
              disabled={deletingId === node.id}
              className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === node.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="text-xs text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
            isHidden ? "opacity-40" : ""
          }`}
          style={{ paddingLeft: `${depth * 32 + 12}px` }}
        >
          {/* Sort arrows */}
          <div className="flex flex-col shrink-0">
            <button
              onClick={() => siblingInfo && swapSortOrder(siblingInfo.parentId, siblingInfo.index, "up")}
              disabled={isFirst || sortingId === node.id}
              className="p-0.5 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => siblingInfo && swapSortOrder(siblingInfo.parentId, siblingInfo.index, "down")}
              disabled={isLast || sortingId === node.id}
              className="p-0.5 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

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

          {/* Icon */}
          {node.icon && !isEditingLabel && (
            <span className="text-sm shrink-0">{node.icon}</span>
          )}

          {/* Label (click to inline edit) */}
          {isEditingLabel ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 px-1 border-b-2 border-pink-300 bg-transparent text-sm text-base font-medium outline-none flex-1 min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit()
                if (e.key === "Escape") setEditingId(null)
              }}
              onBlur={() => saveEdit()}
            />
          ) : (
            <span
              onClick={() => startEditLabel(node)}
              className={`text-sm cursor-pointer hover:text-pink-600 truncate ${
                isHidden ? "italic line-through" : "font-medium text-gray-800"
              }`}
              title="Click to edit label"
            >
              {node.label}
              {justSaved && <Check className="inline h-3 w-3 text-green-500 ml-1" />}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Href display (click to edit) */}
          {node.href && !isEditingHref && !isEditingLabel && (
            <span
              onClick={() => startEditHref(node)}
              className="text-xs text-gray-400 truncate max-w-[180px] cursor-pointer hover:text-pink-500 hidden sm:inline"
              title="Click to edit link"
            >
              {node.href}
            </span>
          )}
          {isEditingHref && (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 px-1 border-b-2 border-pink-300 bg-transparent text-xs text-base outline-none w-48"
              autoFocus
              placeholder="/category/slug"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit()
                if (e.key === "Escape") setEditingId(null)
              }}
              onBlur={() => saveEdit()}
            />
          )}

          {/* Type badge */}
          {typeBadge(node.itemType)}

          {/* Add child button */}
          {node.itemType === "top_level" && (
            <button
              onClick={() => startAddChild(node.id, "category_group")}
              className="text-xs text-blue-600 font-medium hover:underline shrink-0 hidden sm:inline"
              title="Add Subgroup"
            >
              <Plus className="h-3 w-3 inline" />
              Subgroup
            </button>
          )}
          {node.itemType === "category_group" && (
            <button
              onClick={() => startAddChild(node.id, "link")}
              className="text-xs text-green-600 font-medium hover:underline shrink-0"
              title="Add Link"
            >
              <Plus className="h-3 w-3 inline" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setConfirmDeleteId(confirmDeleteId === node.id ? null : node.id)}
            disabled={deletingId === node.id}
            className="text-xs text-red-400 hover:text-red-600 shrink-0 p-1"
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

        {/* Inline add form for subgroup or link */}
        {addingTo === node.id && (
          <div
            className="flex items-center gap-2 py-2.5 px-3 bg-pink-50 border-b border-pink-100"
            style={{ paddingLeft: `${(depth + 1) * 32 + 12}px` }}
          >
            <span className="text-xs text-gray-500 shrink-0">
              {addType === "category_group" ? "Group:" : "Link:"}
            </span>
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder={addType === "category_group" ? "e.g. By Occasion" : "e.g. Birthday Cakes"}
              className="h-7 px-2 border border-gray-300 rounded text-sm text-base flex-1 min-w-0 max-w-[200px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChild()
                if (e.key === "Escape") setAddingTo(null)
              }}
            />
            {addType === "link" && (
              <input
                type="text"
                value={addHref}
                onChange={(e) => setAddHref(e.target.value)}
                placeholder="/category/slug"
                className="h-7 px-2 border border-gray-300 rounded text-sm text-base w-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChild()
                  if (e.key === "Escape") setAddingTo(null)
                }}
              />
            )}
            <button
              onClick={handleAddChild}
              disabled={addSaving || !addLabel.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-pink-600 text-white text-xs font-medium hover:bg-pink-700 disabled:opacity-50"
            >
              {addSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
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

  // ─── Occasions Manager ─────────────────────────────────────────────────

  function findOccasionNodes(): MenuNode[] {
    const nodes: MenuNode[] = []
    function walk(items: MenuNode[]) {
      for (const item of items) {
        if (item.itemType === "occasion") nodes.push(item)
        if (item.children.length > 0) walk(item.children)
      }
    }
    walk(menuTree)
    return nodes
  }

  function renderOccasionsManager() {
    const occasionNodes = findOccasionNodes()
    if (occasionNodes.length === 0) return null

    // Map existing occasions by label for lookup
    const occasionMap = new Map<string, MenuNode>()
    for (const node of occasionNodes) {
      occasionMap.set(node.label, node)
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 mt-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg text-gray-900">Occasions Manager</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quick toggles for seasonal and occasion items. Toggle off when the season ends, toggle on when it&apos;s coming up.
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {OCCASION_PRESETS.map((preset) => {
            const node = occasionMap.get(preset.label)
            if (!node) return null
            const isActive = node.isVisible
            return (
              <button
                key={node.id}
                onClick={() => toggleVisibility(node.id, node.isVisible)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? "border-pink-200 bg-pink-50 shadow-sm"
                    : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <span className={`text-2xl ${isActive ? "" : "grayscale"}`}>{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-gray-900" : "text-gray-500"}`}>
                    {preset.label}
                  </p>
                  <p className={`text-[10px] ${isActive ? "text-green-600" : "text-gray-400"}`}>
                    {isActive ? "Active" : "Hidden"}
                  </p>
                </div>
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                    isActive ? "bg-pink-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isActive ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            )
          })}
          {/* Show any occasion nodes NOT in presets */}
          {occasionNodes
            .filter((n) => !OCCASION_PRESETS.some((p) => p.label === n.label))
            .map((node) => {
              const isActive = node.isVisible
              return (
                <button
                  key={node.id}
                  onClick={() => toggleVisibility(node.id, node.isVisible)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? "border-pink-200 bg-pink-50 shadow-sm"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <span className={`text-2xl ${isActive ? "" : "grayscale"}`}>{node.icon || "\uD83C\uDF89"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-gray-900" : "text-gray-500"}`}>
                      {node.label}
                    </p>
                    <p className={`text-[10px] ${isActive ? "text-green-600" : "text-gray-400"}`}>
                      {isActive ? "Active" : "Hidden"}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                      isActive ? "bg-pink-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              )
            })}
        </div>
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
    <div className="space-y-0">
      {/* Menu Tree */}
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
            onClick={openAddDialog}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Top-Level Item
          </button>
        </div>

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

      {/* Occasions Manager */}
      {renderOccasionsManager()}

      {/* Add Top-Level Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Top-Level Item</DialogTitle>
            <DialogDescription>
              Create a new top-level navigation menu entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dialogLabel}
                onChange={(e) => {
                  setDialogLabel(e.target.value)
                  // Auto-generate slug if slug hasn't been manually edited
                  if (!dialogSlug || dialogSlug === generateSlug(dialogLabel)) {
                    setDialogSlug(generateSlug(e.target.value))
                  }
                }}
                placeholder="e.g. Mother's Day"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:border-pink-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dialogLabel.trim()) handleAddTopLevel()
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={dialogSlug}
                onChange={(e) => setDialogSlug(e.target.value)}
                placeholder="e.g. mothers-day"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-base text-gray-500 focus:outline-none focus:border-pink-400"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-generated from label. Edit if needed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (optional)
              </label>
              <input
                type="text"
                value={dialogIcon}
                onChange={(e) => setDialogIcon(e.target.value)}
                placeholder="Paste an emoji e.g. \uD83D\uDC69"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:border-pink-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dialog-visible"
                checked={dialogVisible}
                onChange={(e) => setDialogVisible(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="dialog-visible" className="text-sm text-gray-700">
                Visible by default
              </label>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowAddDialog(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTopLevel}
              disabled={dialogSaving || !dialogLabel.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
            >
              {dialogSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0" />
            )}
            {toast.message}
          </div>
        </div>
      )}
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

function sortTree(nodes: MenuNode[]): MenuNode[] {
  return [...nodes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((node) => ({
      ...node,
      children: sortTree(node.children),
    }))
}
