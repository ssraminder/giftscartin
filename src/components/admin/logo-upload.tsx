"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Link as LinkIcon, Check, Loader2 } from "lucide-react"

interface LogoUploadProps {
  currentUrl: string | null
  label: string
  previewClass: string
  acceptTypes: string
  recommendationText: string
  onSave: (file: File | null, url: string | null) => Promise<void>
}

export function LogoUpload({
  currentUrl,
  label,
  previewClass,
  acceptTypes,
  recommendationText,
  onSave,
}: LogoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "File too large. Maximum size: 2MB" })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMessage(null)
    setShowUrlInput(false)
  }

  function handleCancel() {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setMessage(null)
  }

  async function handleSaveFile() {
    if (!selectedFile) return
    setSaving(true)
    setMessage(null)
    try {
      await onSave(selectedFile, null)
      setMessage({ type: "success", text: "Updated successfully" })
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveUrl() {
    if (!urlInput.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      await onSave(null, urlInput.trim())
      setMessage({ type: "success", text: "Updated successfully" })
      setUrlInput("")
      setShowUrlInput(false)
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  const displayUrl = previewUrl || currentUrl

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Left - Current Preview */}
      <div className="flex flex-col items-center">
        <div
          className={`${previewClass} relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center`}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={label}
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <span className="text-sm text-gray-400">No {label.toLowerCase()} uploaded</span>
          )}
        </div>
        <span className="text-xs text-gray-400 mt-2">
          {previewUrl ? "Preview" : displayUrl ? `Current ${label.toLowerCase()}` : ""}
        </span>
      </div>

      {/* Right - Upload Controls */}
      <div className="flex-1 min-w-0">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E91E63] text-[#E91E63] text-sm font-medium hover:bg-pink-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload New {label}
            </button>
            <p className="text-xs text-gray-400 mt-2">{recommendationText}</p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-xs text-gray-400">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveFile}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E91E63] text-white text-sm font-medium hover:bg-[#D81B60] transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save {label}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* URL input option */}
        {!selectedFile && (
          <div className="mt-4">
            {!showUrlInput ? (
              <button
                onClick={() => setShowUrlInput(true)}
                className="text-xs text-gray-500 hover:text-[#E91E63] transition-colors flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" />
                Or enter URL directly
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm text-base focus:outline-none focus:border-pink-400"
                  />
                  <button
                    onClick={handleSaveUrl}
                    disabled={saving || !urlInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#E91E63] text-white text-sm font-medium hover:bg-[#D81B60] transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set URL"}
                  </button>
                  <button
                    onClick={() => {
                      setShowUrlInput(false)
                      setUrlInput("")
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {message && (
          <p
            className={`text-sm mt-3 ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.type === "success" ? "\u2705 " : ""}{message.text}
          </p>
        )}
      </div>
    </div>
  )
}
