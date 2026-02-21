'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Wedding',
  'Baby Shower',
  'Congratulations',
  'Get Well Soon',
  'Thank You',
  'Farewell',
  'Housewarming',
  'Diwali',
  'Holi',
  'Raksha Bandhan',
  'Bhai Dooj',
  "Mother's Day",
  "Father's Day",
  "Valentine's Day",
  'Friendship Day',
  'Just Because',
  'Other',
]

export interface SenderDetails {
  senderName: string
  senderPhone: string
  senderEmail: string
  occasion: string
  giftMessage: string
}

interface SenderDetailsStepProps {
  value: SenderDetails
  onChange: (details: SenderDetails) => void
  onContinue: () => void
  onBack: () => void
}

export function SenderDetailsStep({ value, onChange, onContinue, onBack }: SenderDetailsStepProps) {
  const { data: session } = useSession()
  const [errors, setErrors] = useState<Partial<Record<keyof SenderDetails, string>>>({})

  // Auto-fill from session on first render
  useEffect(() => {
    if (session?.user && !value.senderName) {
      onChange({
        ...value,
        senderName: session.user.name || '',
        senderPhone: (session.user as Record<string, unknown>).phone as string || '',
        senderEmail: session.user.email || '',
      })
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!value.senderName.trim()) {
      newErrors.senderName = 'Your name is required'
    }
    if (!value.senderPhone.trim()) {
      newErrors.senderPhone = 'Your mobile number is required'
    } else if (!/^\d{10}$/.test(value.senderPhone)) {
      newErrors.senderPhone = 'Enter a valid 10-digit mobile number'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validate()) onContinue()
  }

  const charCount = value.giftMessage.length
  const maxChars = 200

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Details</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          So the recipient knows who sent this gift
        </p>
      </div>

      {/* Your Name */}
      <div>
        <Label htmlFor="senderName">
          Your Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="senderName"
          className="text-base mt-1"
          placeholder="Full name"
          value={value.senderName}
          onChange={e => onChange({ ...value, senderName: e.target.value })}
        />
        {errors.senderName && (
          <p className="text-xs text-red-500 mt-1">{errors.senderName}</p>
        )}
      </div>

      {/* Your Mobile */}
      <div>
        <Label htmlFor="senderPhone">
          Your Mobile <span className="text-red-500">*</span>
        </Label>
        <Input
          id="senderPhone"
          type="tel"
          inputMode="numeric"
          className="text-base mt-1"
          placeholder="10-digit mobile number"
          maxLength={10}
          value={value.senderPhone}
          onChange={e =>
            onChange({ ...value, senderPhone: e.target.value.replace(/\D/g, '') })
          }
        />
        <p className="text-xs text-gray-400 mt-1">For delivery coordination if needed</p>
        {errors.senderPhone && (
          <p className="text-xs text-red-500 mt-1">{errors.senderPhone}</p>
        )}
      </div>

      {/* Your Email (optional) */}
      <div>
        <Label htmlFor="senderEmail">
          Your Email{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="senderEmail"
          type="email"
          inputMode="email"
          className="text-base mt-1"
          placeholder="your@email.com"
          value={value.senderEmail}
          onChange={e => onChange({ ...value, senderEmail: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">Order confirmation and invoice</p>
      </div>

      {/* Occasion */}
      <div>
        <Label htmlFor="occasion">
          Occasion{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <select
          id="occasion"
          className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
          value={value.occasion}
          onChange={e => onChange({ ...value, occasion: e.target.value })}
        >
          <option value="">Select occasion</option>
          {OCCASIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Gift Card Message */}
      <div>
        <Label htmlFor="giftMessage">
          Gift Card Message{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <textarea
          id="giftMessage"
          className="w-full mt-1 px-3 py-2 text-base border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          rows={3}
          placeholder="Write a personal message for the gift card..."
          maxLength={maxChars}
          value={value.giftMessage}
          onChange={e => onChange({ ...value, giftMessage: e.target.value })}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-gray-400">Printed on the gift card inside the package</p>
          <p
            className={`text-xs ${
              charCount > maxChars * 0.9 ? 'text-amber-500' : 'text-gray-400'
            }`}
          >
            {charCount}/{maxChars}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600
                     font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex-[2] py-3 bg-pink-500 hover:bg-pink-600 text-white
                     rounded-xl font-semibold transition-colors"
        >
          Continue to Delivery Slot
        </button>
      </div>
    </div>
  )
}
