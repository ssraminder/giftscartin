'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'

interface DraggableResizableProps {
  x: number           // % 0-100
  y: number           // % 0-100
  w: number           // % 0-100
  h: number           // % 0-100
  containerRef: React.RefObject<HTMLDivElement | null>
  label?: string
  accentColor?: string
  lockRatio?: boolean
  disabled?: boolean
  isSelected?: boolean
  rotation?: number
  opacity?: number    // 0-100
  zIndex?: number
  snapToGrid?: boolean
  onClick?: () => void
  onChange: (x: number, y: number, w: number, h: number) => void
  children?: React.ReactNode
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

export function DraggableResizable({
  x, y, w, h,
  containerRef,
  label,
  accentColor = '#E91E63',
  disabled = false,
  isSelected = false,
  rotation = 0,
  opacity = 100,
  zIndex = 10,
  snapToGrid = false,
  onClick,
  onChange,
  children,
}: DraggableResizableProps) {
  const isDragging = useRef(false)
  const isResizing = useRef<ResizeHandle | null>(null)
  const startMouse = useRef({ mx: 0, my: 0 })
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const [, forceUpdate] = useState(0)

  const snap = useCallback((v: number) => {
    if (!snapToGrid) return v
    return Math.round(v / 2.5) * 2.5
  }, [snapToGrid])

  const clamp = useCallback((val: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, val))
  }, [])

  const getContainerSize = useCallback(() => {
    if (!containerRef.current) return { cw: 1, ch: 1 }
    return { cw: containerRef.current.offsetWidth, ch: containerRef.current.offsetHeight }
  }, [containerRef])

  const handlePointerDown = useCallback((e: React.PointerEvent, handle?: ResizeHandle) => {
    if (disabled) return
    e.stopPropagation()
    e.preventDefault()

    const { cw, ch } = getContainerSize()
    startMouse.current = { mx: e.clientX, my: e.clientY }
    startRect.current = { x, y, w, h }

    if (handle) {
      isResizing.current = handle
    } else {
      isDragging.current = true
    }

    const handleMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startMouse.current.mx) / cw) * 100
      const dy = ((ev.clientY - startMouse.current.my) / ch) * 100
      const s = startRect.current

      if (isDragging.current) {
        const newX = snap(clamp(s.x + dx, 0, 100 - s.w))
        const newY = snap(clamp(s.y + dy, 0, 100 - s.h))
        onChange(newX, newY, s.w, s.h)
      } else if (isResizing.current) {
        let newX = s.x, newY = s.y, newW = s.w, newH = s.h

        const dir = isResizing.current
        if (dir.includes('e')) { newW = clamp(s.w + dx, 5, 100 - s.x) }
        if (dir.includes('w')) { newX = clamp(s.x + dx, 0, s.x + s.w - 5); newW = s.w - (newX - s.x) }
        if (dir.includes('s')) { newH = clamp(s.h + dy, 5, 100 - s.y) }
        if (dir.includes('n')) { newY = clamp(s.y + dy, 0, s.y + s.h - 5); newH = s.h - (newY - s.y) }

        onChange(snap(newX), snap(newY), snap(newW), snap(newH))
      }
    }

    const handleUp = () => {
      isDragging.current = false
      isResizing.current = null
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [disabled, x, y, w, h, onChange, snap, clamp, getContainerSize])

  // Force re-render when selection changes to properly show handles
  useEffect(() => {
    forceUpdate(n => n + 1)
  }, [isSelected])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }, [onClick])

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        opacity: opacity / 100,
        zIndex: zIndex,
        cursor: disabled ? 'default' : 'move',
        outline: isSelected ? `2px solid ${accentColor}` : 'none',
        outlineOffset: '1px',
      }}
      onPointerDown={(e) => handlePointerDown(e)}
      onClick={handleClick}
    >
      {children}

      {/* Label tag */}
      {isSelected && label && !disabled && (
        <div
          className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-medium text-white rounded-t whitespace-nowrap pointer-events-none"
          style={{ backgroundColor: accentColor }}
        >
          {label}
        </div>
      )}

      {/* Resize handles */}
      {isSelected && !disabled && (
        <>
          {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as ResizeHandle[]).map(handle => {
            const pos: React.CSSProperties = {}
            if (handle.includes('n')) pos.top = '-4px'
            if (handle.includes('s')) pos.bottom = '-4px'
            if (handle.includes('w')) pos.left = '-4px'
            if (handle.includes('e')) pos.right = '-4px'
            if (handle === 'n' || handle === 's') { pos.left = '50%'; pos.marginLeft = '-4px' }
            if (handle === 'e' || handle === 'w') { pos.top = '50%'; pos.marginTop = '-4px' }

            return (
              <div
                key={handle}
                className="absolute"
                style={{
                  ...pos,
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'white',
                  border: `2px solid ${accentColor}`,
                  borderRadius: '2px',
                  cursor: HANDLE_CURSORS[handle],
                  zIndex: 999,
                }}
                onPointerDown={(e) => handlePointerDown(e, handle)}
              />
            )
          })}
        </>
      )}
    </div>
  )
}
