'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  type Layer,
  type BackgroundLayer,
  type ImageLayer,
  type TextLayer,
  type ShapeLayer,
  type BadgeLayer,
  type ButtonLayer,
  GOOGLE_FONTS,
} from '@/lib/banner-layers'

// ==================== Props ====================

interface BannerLayerRendererProps {
  layers: Layer[]
  aspectRatio?: string    // default '16/5'
  className?: string
  priority?: boolean      // for next/image priority loading
}

// ==================== Font Helpers ====================

function collectFonts(layers: Layer[]): string[] {
  const fonts = new Set<string>()
  layers.forEach(l => {
    if ('fontFamily' in l && l.fontFamily && l.fontFamily !== 'system-ui') {
      fonts.add(l.fontFamily as string)
    }
  })
  return Array.from(fonts)
}

function buildFontsUrl(families: string[]): string | null {
  if (families.length === 0) return null
  const params = families.map(family => {
    const font = GOOGLE_FONTS.find(f => f.family === family)
    const weights = font?.weights ?? [400, 700]
    return `family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}`
  }).join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

// ==================== Layer Renderers ====================

function renderBackgroundLayer(layer: BackgroundLayer, priority?: boolean) {
  return (
    <div
      key={layer.id}
      className="absolute inset-0"
      style={{ zIndex: layer.zIndex, opacity: layer.opacity / 100 }}
    >
      {layer.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layer.imageUrl}
          alt=""
          className="w-full h-full"
          style={{ objectFit: layer.objectFit, objectPosition: layer.objectPosition }}
          loading={priority ? 'eager' : 'lazy'}
        />
      ) : layer.gradient ? (
        <div className="w-full h-full" style={{ background: layer.gradient }} />
      ) : (
        <div className="w-full h-full" style={{ backgroundColor: layer.color }} />
      )}
    </div>
  )
}

function renderImageLayer(layer: ImageLayer, priority?: boolean) {
  return (
    <div
      key={layer.id}
      className="absolute"
      style={{
        left: `${layer.x}%`, top: `${layer.y}%`,
        width: `${layer.w}%`, height: `${layer.h}%`,
        zIndex: layer.zIndex,
        opacity: layer.opacity / 100,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        visibility: layer.visible ? 'visible' : 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={layer.imageUrl}
        alt=""
        className="w-full h-full pointer-events-none select-none"
        style={{
          objectFit: layer.objectFit,
          objectPosition: layer.objectPosition,
          borderRadius: `${layer.borderRadius}px`,
          filter: layer.dropShadow ? 'drop-shadow(0 4px 24px rgba(0,0,0,0.25))' : 'none',
        }}
        loading={priority ? 'eager' : 'lazy'}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </div>
  )
}

function renderTextLayer(layer: TextLayer) {
  return (
    <div
      key={layer.id}
      className="absolute overflow-hidden pointer-events-none select-none"
      style={{
        left: `${layer.x}%`, top: `${layer.y}%`,
        width: `${layer.w}%`, height: `${layer.h}%`,
        zIndex: layer.zIndex,
        opacity: layer.opacity / 100,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        visibility: layer.visible ? 'visible' : 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent:
          layer.verticalAlign === 'top' ? 'flex-start'
          : layer.verticalAlign === 'bottom' ? 'flex-end'
          : 'center',
        fontFamily: `'${layer.fontFamily}', sans-serif`,
        fontSize: `${layer.fontSize}px`,
        fontWeight: layer.fontWeight,
        lineHeight: layer.lineHeight,
        letterSpacing: `${layer.letterSpacing}px`,
        textAlign: layer.textAlign,
      }}
      dangerouslySetInnerHTML={{ __html: layer.html }}
    />
  )
}

function renderShapeLayer(layer: ShapeLayer) {
  return (
    <div
      key={layer.id}
      className="absolute pointer-events-none"
      style={{
        left: `${layer.x}%`, top: `${layer.y}%`,
        width: `${layer.w}%`, height: `${layer.h}%`,
        zIndex: layer.zIndex,
        opacity: layer.opacity / 100,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        visibility: layer.visible ? 'visible' : 'hidden',
        background: layer.fill,
        borderRadius: layer.shape === 'circle' ? '50%' : `${layer.borderRadius}px`,
        border: layer.borderWidth > 0
          ? `${layer.borderWidth}px solid ${layer.borderColor}`
          : 'none',
      }}
    />
  )
}

function renderBadgeLayer(layer: BadgeLayer) {
  return (
    <div
      key={layer.id}
      className="absolute pointer-events-none"
      style={{
        left: `${layer.x}%`, top: `${layer.y}%`,
        zIndex: layer.zIndex,
        opacity: layer.opacity / 100,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        visibility: layer.visible ? 'visible' : 'hidden',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          padding: `${layer.paddingY}px ${layer.paddingX}px`,
          borderRadius: `${layer.borderRadius}px`,
          backgroundColor: layer.bgColor,
          color: layer.textColor,
          fontFamily: `'${layer.fontFamily}', sans-serif`,
          fontSize: `${layer.fontSize}px`,
          fontWeight: layer.fontWeight,
          border: layer.borderWidth > 0
            ? `${layer.borderWidth}px solid ${layer.borderColor}`
            : 'none',
        }}
      >
        {layer.icon && <span>{layer.icon}</span>}
        {layer.text}
      </div>
    </div>
  )
}

function renderButtonLayer(layer: ButtonLayer) {
  return (
    <a
      key={layer.id}
      href={layer.href || '#'}
      className="absolute"
      style={{
        left: `${layer.x}%`, top: `${layer.y}%`,
        zIndex: layer.zIndex,
        opacity: layer.opacity / 100,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        visibility: layer.visible ? 'visible' : 'hidden',
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          padding: `${layer.paddingY}px ${layer.paddingX}px`,
          borderRadius: `${layer.borderRadius}px`,
          backgroundColor: layer.bgColor,
          color: layer.textColor,
          fontFamily: `'${layer.fontFamily}', sans-serif`,
          fontSize: `${layer.fontSize}px`,
          fontWeight: layer.fontWeight,
          border: layer.borderWidth > 0
            ? `${layer.borderWidth}px solid ${layer.borderColor}`
            : 'none',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {layer.text}
      </div>
    </a>
  )
}

// ==================== Main Component ====================

export function BannerLayerRenderer({
  layers,
  aspectRatio,
  className,
  priority,
}: BannerLayerRendererProps) {
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth
      const designWidth = 1200
      setScale(Math.min(1, containerWidth / designWidth))
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  const fonts = collectFonts(layers)
  const fontsUrl = buildFontsUrl(fonts)

  const renderLayer = (layer: Layer) => {
    if (!layer.visible) return null
    switch (layer.type) {
      case 'background': return renderBackgroundLayer(layer, priority)
      case 'image': return renderImageLayer(layer as ImageLayer, priority)
      case 'text': return renderTextLayer(layer as TextLayer)
      case 'shape': return renderShapeLayer(layer as ShapeLayer)
      case 'badge': return renderBadgeLayer(layer as BadgeLayer)
      case 'button': return renderButtonLayer(layer as ButtonLayer)
      default: return null
    }
  }

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}
      <div
        ref={containerRef}
        className={cn('relative w-full overflow-hidden', className)}
        style={{ aspectRatio: aspectRatio ?? '16/5' }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
          }}
        >
          {sortedLayers.map(renderLayer)}
        </div>
      </div>
    </>
  )
}
