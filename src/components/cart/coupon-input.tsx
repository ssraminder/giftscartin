"use client"

import { useState } from "react"
import { Tag, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CouponInputProps {
  appliedCode: string | null
  discount: number
  onApply: (code: string) => void
  onRemove: () => void
}

export function CouponInput({
  appliedCode,
  discount,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  const handleApply = () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError("Please enter a coupon code")
      return
    }
    setError("")
    onApply(trimmed)
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600" />
          <div>
            <span className="text-sm font-medium text-green-700">
              {appliedCode}
            </span>
            {discount > 0 && (
              <span className="ml-1 text-xs text-green-600">applied</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Enter coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError("")
            }}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="pl-9 uppercase"
          />
        </div>
        <Button variant="outline" onClick={handleApply}>
          Apply
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
