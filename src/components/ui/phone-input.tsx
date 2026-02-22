'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { TOP_COUNTRIES, OTHER_COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/lib/countries'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  label?: string
}

function parsePhoneValue(value: string): { country: Country; digits: string } {
  if (!value || !value.startsWith('+')) {
    return { country: DEFAULT_COUNTRY, digits: '' }
  }

  const withoutPlus = value.slice(1)

  // Try matching against all countries, longest dial code first
  const allCountries = [...TOP_COUNTRIES, ...OTHER_COUNTRIES]
  const sorted = [...allCountries].sort((a, b) => b.dialCode.length - a.dialCode.length)

  for (const country of sorted) {
    if (withoutPlus.startsWith(country.dialCode)) {
      return {
        country,
        digits: withoutPlus.slice(country.dialCode.length),
      }
    }
  }

  return { country: DEFAULT_COUNTRY, digits: withoutPlus }
}

export function PhoneInput({
  value,
  onChange,
  placeholder = 'Mobile number',
  required,
  disabled,
  error,
  label,
}: PhoneInputProps) {
  const parsed = parsePhoneValue(value)
  const [selectedCountry, setSelectedCountry] = useState<Country>(parsed.country)
  const [digits, setDigits] = useState(parsed.digits)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync from external value changes
  useEffect(() => {
    const p = parsePhoneValue(value)
    setSelectedCountry(p.country)
    setDigits(p.digits)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  const emitValue = useCallback(
    (country: Country, rawDigits: string) => {
      const cleaned = rawDigits.replace(/\D/g, '').replace(/^0+/, '')
      onChange(`+${country.dialCode}${cleaned}`)
    },
    [onChange]
  )

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '')
    setDigits(raw)
    emitValue(selectedCountry, raw)
  }

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setOpen(false)
    setSearch('')
    emitValue(country, digits)
  }

  const lowerSearch = search.toLowerCase()
  const filteredTop = TOP_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerSearch) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(lowerSearch)
  )
  const filteredOther = OTHER_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerSearch) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(lowerSearch)
  )

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`relative flex items-stretch rounded-lg border ${
          error
            ? 'border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500'
            : 'border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Country code dropdown trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setOpen(!open)}
            disabled={disabled}
            className="flex items-center gap-1 h-full px-3 bg-white rounded-l-lg border-r border-gray-300 hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
            style={{ minWidth: '110px' }}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-gray-700 font-medium">+{selectedCountry.dialCode}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-0.5" />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="overflow-y-auto max-h-56">
                {/* Top countries */}
                {filteredTop.map((c) => (
                  <button
                    key={`top-${c.code}`}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-pink-50 transition-colors text-left ${
                      selectedCountry.code === c.code && selectedCountry.dialCode === c.dialCode
                        ? 'bg-pink-50 text-pink-700'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-gray-400 text-xs">+{c.dialCode}</span>
                  </button>
                ))}

                {/* Divider */}
                {filteredTop.length > 0 && filteredOther.length > 0 && (
                  <div className="border-t border-gray-200 my-1" />
                )}

                {/* Other countries */}
                {filteredOther.map((c) => (
                  <button
                    key={`other-${c.code}`}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-pink-50 transition-colors text-left ${
                      selectedCountry.code === c.code && selectedCountry.dialCode === c.dialCode
                        ? 'bg-pink-50 text-pink-700'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-gray-400 text-xs">+{c.dialCode}</span>
                  </button>
                ))}

                {filteredTop.length === 0 && filteredOther.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={digits}
          onChange={handleDigitsChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1 px-3 py-2.5 text-base bg-transparent rounded-r-lg outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
