"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { Upload, X, FileImage, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadAddonProps {
  group: {
    id: string
    name: string
    acceptedFileTypes: string[]
    maxFileSizeMb: number
    required: boolean
  }
  value: { fileUrl: string | null; fileName: string | null }
  onChange: (value: { fileUrl: string | null; fileName: string | null }) => void
}

export function FileUploadAddon({ group, value, onChange }: FileUploadAddonProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = useMemo(
    () => group.acceptedFileTypes.length > 0 ? group.acceptedFileTypes : ["image/jpeg", "image/png"],
    [group.acceptedFileTypes]
  )

  const acceptString = acceptedTypes.join(",")
  const maxSizeMb = group.maxFileSizeMb

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    // Validate type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${acceptedTypes.map((t) => t.split("/")[1]).join(", ")}`)
      return
    }

    // Validate size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Maximum size: ${maxSizeMb}MB`)
      return
    }

    setUploading(true)
    setProgress(0)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("addonGroupId", group.id)

      const res = await fetch("/api/customer/upload-addon-file", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Upload failed")
      }

      const json = await res.json()
      setProgress(100)
      onChange({ fileUrl: json.data.fileUrl, fileName: file.name })
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [acceptedTypes, maxSizeMb, group.id, onChange])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleRemove = () => {
    onChange({ fileUrl: null, fileName: null })
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  // Uploaded state
  if (value.fileUrl && value.fileName) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
        {value.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || value.fileUrl.includes("image") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.fileUrl}
            alt="Uploaded preview"
            className="h-12 w-12 rounded-lg object-cover border border-green-200"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
            <FileImage className="h-6 w-6 text-green-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">{value.fileName}</p>
          <p className="text-xs text-green-600">Uploaded successfully</p>
        </div>
        <button
          onClick={handleRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Uploading state
  if (uploading) {
    return (
      <div className="rounded-lg border border-[#E91E63]/20 bg-[#FFF9F5] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E91E63] border-t-transparent" />
          <span className="text-sm text-[#1A1A2E]">Uploading...</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E91E63] to-[#FF6B9D] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // Empty / Drop zone state
  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
          dragOver
            ? "border-[#E91E63] bg-[#FFF0F5]"
            : error
              ? "border-red-300 bg-red-50"
              : "border-gray-200 hover:border-[#E91E63]/50 hover:bg-[#FFF9F5]"
        )}
      >
        <Upload className={cn("h-8 w-8 mb-2", error ? "text-red-400" : "text-gray-400")} />
        <p className="text-sm font-medium text-[#1A1A2E]">
          Click to upload or drag &amp; drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {acceptedTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} up to {maxSizeMb}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          className="hidden"
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}
