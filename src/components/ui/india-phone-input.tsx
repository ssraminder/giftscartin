'use client'

import { useState, useEffect } from 'react'

interface IndiaPhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  label?: string
}

function parseIndiaValue(value: string): string {
  if (!value) return ''
  // Strip +91 prefix if present
  if (value.startsWith('+91')) return value.slice(3)
  // Strip leading + and any dial code — just take last 10 digits
  const digitsOnly = value.replace(/\D/g, '')
  return digitsOnly.slice(-10)
}

export function IndiaPhoneInput({
  value,
  onChange,
  placeholder = '10-digit mobile number',
  required,
  disabled,
  error,
  label,
}: IndiaPhoneInputProps) {
  const [digits, setDigits] = useState(parseIndiaValue(value))

  // Sync from external value changes
  useEffect(() => {
    setDigits(parseIndiaValue(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
    setDigits(raw)
    onChange(`+91${raw}`)
  }

  const isInvalid = digits.length === 10 && !/^[6-9]/.test(digits)

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`flex items-stretch rounded-lg border ${
          error || isInvalid
            ? 'border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500'
            : 'border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Static +91 prefix */}
        <div
          className="flex items-center justify-center bg-gray-50 border-r border-gray-300 rounded-l-lg px-3 text-gray-600 font-medium text-sm select-none"
          style={{ minWidth: '64px' }}
        >
          +91
        </div>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={digits}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={10}
          required={required}
          disabled={disabled}
          className="flex-1 px-3 py-2.5 text-base bg-transparent rounded-r-lg outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      {isInvalid && !error && (
        <p className="text-xs text-red-500 mt-1">Indian mobile numbers must start with 6, 7, 8, or 9</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
