'use client'

import { useState, useCallback } from 'react'
import { Lock, Unlock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PositionEditorProps {
  label: string
  x: number
  y: number
  w: number
  h: number
  lockRatio: boolean
  color: 'pink' | 'blue'
  presets: { label: string; x: number; y: number; w: number; h: number }[]
  defaults: { x: number; y: number; w: number; h: number }
  onChange: (values: { x: number; y: number; w: number; h: number; lockRatio: boolean }) => void
}

export function PositionEditor({
  label,
  x,
  y,
  w,
  h,
  lockRatio,
  color,
  presets,
  defaults,
  onChange,
}: PositionEditorProps) {
  const [ratio, setRatio] = useState(() => (h !== 0 ? w / h : 1))

  const accent = color === 'pink' ? 'pink' : 'blue'
  const lockBg = color === 'pink' ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-blue-100 text-blue-700 border-blue-300'
  const unlockBg = 'bg-gray-100 text-gray-500 border-gray-300'

  const handleToggleLock = useCallback(() => {
    const newLock = !lockRatio
    if (newLock) {
      setRatio(h !== 0 ? w / h : 1)
    }
    onChange({ x, y, w, h, lockRatio: newLock })
  }, [lockRatio, x, y, w, h, onChange])

  const handleChange = useCallback(
    (field: 'x' | 'y' | 'w' | 'h', raw: string) => {
      let val = parseFloat(raw)
      if (isNaN(val)) val = 0
      val = Math.max(0, Math.min(100, val))

      if (field === 'w' && lockRatio) {
        const newH = ratio !== 0 ? val / ratio : h
        onChange({ x, y, w: val, h: Math.max(0, Math.min(100, parseFloat(newH.toFixed(1)))), lockRatio })
      } else if (field === 'h' && lockRatio) {
        const newW = val * ratio
        onChange({ x, y, w: Math.max(0, Math.min(100, parseFloat(newW.toFixed(1)))), h: val, lockRatio })
      } else {
        onChange({
          x: field === 'x' ? val : x,
          y: field === 'y' ? val : y,
          w: field === 'w' ? val : w,
          h: field === 'h' ? val : h,
          lockRatio,
        })
      }
    },
    [x, y, w, h, lockRatio, ratio, onChange]
  )

  const handleReset = useCallback(() => {
    onChange({ ...defaults, lockRatio: false })
  }, [defaults, onChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium text-${accent}-700`}>{label}</span>
        <button
          type="button"
          onClick={handleToggleLock}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${lockRatio ? lockBg : unlockBg}`}
          title={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        >
          {lockRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {lockRatio ? 'Locked' : 'Lock ratio'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['x', 'y', 'w', 'h'] as const).map(field => (
          <div key={field}>
            <label className="text-[10px] uppercase text-gray-400 font-medium">{field}</label>
            <div className="relative">
              <input
                type="number"
                step={0.5}
                min={0}
                max={100}
                value={({ x, y, w, h })[field]}
                onChange={e => handleChange(field, e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm pr-5 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ x: p.x, y: p.y, w: p.w, h: p.h, lockRatio })}
            className={`text-[11px] px-2 py-0.5 rounded border border-${accent}-200 bg-white text-${accent}-700 hover:bg-${accent}-50 transition-colors`}
          >
            {p.label}
          </button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-[11px] text-gray-500 h-auto py-0.5 px-1.5"
        >
          <RotateCcw className="w-3 h-3 mr-0.5" />
          Reset
        </Button>
      </div>
    </div>
  )
}
