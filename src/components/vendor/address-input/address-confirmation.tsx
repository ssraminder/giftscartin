'use client'

import { CheckCircle2, Edit2 } from 'lucide-react'
import type { VendorAddressResult } from './types'

interface Props {
  result: VendorAddressResult
  onDetailsChange: (details: string) => void
  onReset: () => void
}

export function AddressConfirmation({ result, onDetailsChange, onReset }: Props) {
  return (
    <div className="space-y-4">
      {/* Confirmed address banner */}
      <div className="flex items-start gap-3 p-3 bg-green-50 border
        border-green-200 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800">
            Location confirmed
          </p>
          <p className="text-sm text-green-700 mt-0.5 line-clamp-2">
            {result.address}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {result.pincode && (
              <span className="text-xs bg-green-100 text-green-700
                px-2 py-0.5 rounded-full font-medium">
                {result.pincode}
              </span>
            )}
            {result.city && (
              <span className="text-xs text-green-600">
                {result.city}, {result.state}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 p-1.5 text-green-600 hover:text-green-800
            hover:bg-green-100 rounded transition-colors"
          title="Change address"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editable shop details */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
          Shop details
          <span className="ml-1 text-xs text-gray-400 font-normal">
            (unit, floor, landmark)
          </span>
        </label>
        <input
          type="text"
          value={result.details}
          onChange={(e) => onDetailsChange(e.target.value)}
          placeholder="e.g. Shop 4, Ground Floor, near HDFC Bank"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg
            text-sm focus:outline-none focus:border-pink-500
            focus:ring-1 focus:ring-pink-500 transition-colors"
        />
        <p className="text-xs text-gray-400">
          This helps customers find your shop for pickups
        </p>
      </div>

      {/* Coordinates (collapsed, for transparency) */}
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer
          hover:text-gray-600 transition-colors list-none flex items-center gap-1">
          <span className="group-open:hidden">&#9654;</span>
          <span className="hidden group-open:inline">&#9660;</span>
          Coordinates
        </summary>
        <p className="text-xs text-gray-400 mt-1 font-mono pl-4">
          {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
          <span className="ml-2 text-gray-300">
            via {result.source}
          </span>
        </p>
      </details>
    </div>
  )
}
