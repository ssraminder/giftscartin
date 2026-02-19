"use client"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/hooks/use-currency"
import { FileUploadAddon } from "./file-upload-addon"
import type { ProductAddonGroup, AddonGroupSelection } from "@/types"

interface AddonGroupProps {
  group: ProductAddonGroup
  value: AddonGroupSelection
  onChange: (value: AddonGroupSelection) => void
  hasError: boolean
}

export function AddonGroup({ group, value, onChange, hasError }: AddonGroupProps) {
  const { formatPrice } = useCurrency()

  const errorBorder = hasError ? "border-red-400 ring-1 ring-red-200" : ""

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", errorBorder || "border-gray-100")}>
      {/* Group header */}
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[#1A1A2E]">{group.name}</h4>
        {group.required && (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Required
          </span>
        )}
      </div>
      {group.description && (
        <p className="text-xs text-muted-foreground">{group.description}</p>
      )}
      {hasError && (
        <p className="text-xs text-red-500">Please make a selection</p>
      )}

      {/* CHECKBOX */}
      {group.type === "CHECKBOX" && value.type === "CHECKBOX" && (
        <div className="space-y-2">
          {group.options.map((option) => {
            const checked = value.selectedIds.includes(option.id)
            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  checked
                    ? "border-[#E91E63] bg-[#FFF0F5]"
                    : "border-gray-200 hover:border-[#E91E63]/30"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? value.selectedIds.filter((id) => id !== option.id)
                      : [...value.selectedIds, option.id]
                    onChange({ type: "CHECKBOX", selectedIds: next })
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                />
                <span className="flex-1 text-sm text-[#1A1A2E]">{option.label}</span>
                {Number(option.price) > 0 && (
                  <span className="text-xs font-semibold text-[#E91E63]">
                    +{formatPrice(Number(option.price))}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}

      {/* RADIO */}
      {group.type === "RADIO" && value.type === "RADIO" && (
        <div className="space-y-2">
          {group.options.map((option) => {
            const checked = value.selectedId === option.id
            return (
              <label
                key={option.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  checked
                    ? "border-[#E91E63] bg-[#FFF0F5]"
                    : "border-gray-200 hover:border-[#E91E63]/30"
                )}
              >
                <input
                  type="radio"
                  name={`addon-${group.id}`}
                  checked={checked}
                  onChange={() => onChange({ type: "RADIO", selectedId: option.id })}
                  className="h-4 w-4 border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                />
                <span className="flex-1 text-sm text-[#1A1A2E]">{option.label}</span>
                {Number(option.price) > 0 && (
                  <span className="text-xs font-semibold text-[#E91E63]">
                    +{formatPrice(Number(option.price))}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}

      {/* SELECT */}
      {group.type === "SELECT" && value.type === "SELECT" && (
        <select
          value={value.selectedId || ""}
          onChange={(e) =>
            onChange({ type: "SELECT", selectedId: e.target.value || null })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] bg-white"
        >
          <option value="">Select an option...</option>
          {group.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {Number(option.price) > 0 ? ` (+${formatPrice(Number(option.price))})` : ""}
            </option>
          ))}
        </select>
      )}

      {/* TEXT_INPUT */}
      {group.type === "TEXT_INPUT" && value.type === "TEXT_INPUT" && (
        <div className="space-y-1">
          <input
            type="text"
            value={value.text}
            onChange={(e) => onChange({ type: "TEXT_INPUT", text: e.target.value })}
            maxLength={group.maxLength || undefined}
            placeholder={group.placeholder || "Enter text..."}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63]"
          />
          {group.maxLength && (
            <p className="text-xs text-muted-foreground text-right">
              {value.text.length}/{group.maxLength}
            </p>
          )}
        </div>
      )}

      {/* TEXTAREA */}
      {group.type === "TEXTAREA" && value.type === "TEXTAREA" && (
        <div className="space-y-1">
          <textarea
            value={value.text}
            onChange={(e) => onChange({ type: "TEXTAREA", text: e.target.value })}
            maxLength={group.maxLength || undefined}
            placeholder={group.placeholder || "Enter message..."}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] resize-none"
          />
          {group.maxLength && (
            <p className="text-xs text-muted-foreground text-right">
              {value.text.length}/{group.maxLength}
            </p>
          )}
        </div>
      )}

      {/* FILE_UPLOAD */}
      {group.type === "FILE_UPLOAD" && value.type === "FILE_UPLOAD" && (
        <FileUploadAddon
          group={{
            id: group.id,
            name: group.name,
            acceptedFileTypes: group.acceptedFileTypes,
            maxFileSizeMb: group.maxFileSizeMb || 5,
            required: group.required,
          }}
          value={{ fileUrl: value.fileUrl, fileName: value.fileName }}
          onChange={(v) =>
            onChange({ type: "FILE_UPLOAD", fileUrl: v.fileUrl, fileName: v.fileName })
          }
        />
      )}
    </div>
  )
}
