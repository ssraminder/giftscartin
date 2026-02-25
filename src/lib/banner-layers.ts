// ==================== Layer Types ====================

export type LayerType = 'background' | 'image' | 'text' | 'shape' | 'badge' | 'button'

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  x: number          // % 0-100
  y: number          // % 0-100
  w: number          // % 0-100
  h: number          // % 0-100
  rotation: number   // degrees, default 0
  opacity: number    // 0-100, default 100
  zIndex: number     // position in stack, higher = front
}

export interface BackgroundLayer extends BaseLayer {
  type: 'background'
  imageUrl: string
  color: string           // fallback solid color
  gradient: string        // CSS gradient string, empty if none
  objectFit: 'cover' | 'contain' | 'fill'
  objectPosition: string  // 'center center' etc
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  imageUrl: string
  objectFit: 'contain' | 'cover' | 'fill'
  objectPosition: string
  borderRadius: number    // px
  dropShadow: boolean
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  html: string
  fontFamily: string
  fontSize: number        // px
  fontWeight: number      // 300/400/500/600/700/800/900
  lineHeight: number      // e.g. 1.2
  letterSpacing: number   // px
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'center' | 'bottom'
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  shape: 'rectangle' | 'circle' | 'gradient-overlay'
  fill: string            // CSS color or gradient
  borderRadius: number    // px
  borderWidth: number     // px
  borderColor: string
}

export interface BadgeLayer extends BaseLayer {
  type: 'badge'
  text: string
  icon: string            // emoji or empty string
  fontFamily: string
  fontSize: number        // px
  fontWeight: number
  bgColor: string
  textColor: string
  borderRadius: number    // px — 999 for pill
  paddingX: number        // px
  paddingY: number        // px
  borderWidth: number
  borderColor: string
}

export interface ButtonLayer extends BaseLayer {
  type: 'button'
  text: string
  href: string
  fontFamily: string
  fontSize: number        // px
  fontWeight: number
  bgColor: string
  textColor: string
  borderRadius: number    // px
  paddingX: number        // px
  paddingY: number        // px
  borderWidth: number
  borderColor: string
}

export type Layer = BackgroundLayer | ImageLayer | TextLayer |
                    ShapeLayer | BadgeLayer | ButtonLayer

// ==================== Google Fonts ====================

export interface GoogleFont {
  family: string
  category: 'sans-serif' | 'serif' | 'display' | 'script' | 'devanagari'
  weights: number[]
}

export const GOOGLE_FONTS: GoogleFont[] = [
  { family: 'Poppins', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Montserrat', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
  { family: 'Raleway', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Oswald', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Lato', category: 'sans-serif', weights: [300, 400, 700, 900] },
  { family: 'Nunito', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'DM Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Inter', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Roboto Slab', category: 'serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Crimson Text', category: 'serif', weights: [400, 600, 700] },
  { family: 'Dancing Script', category: 'script', weights: [400, 500, 600, 700] },
  { family: 'Pacifico', category: 'display', weights: [400] },
  { family: 'Lobster', category: 'display', weights: [400] },
  { family: 'Great Vibes', category: 'script', weights: [400] },
  { family: 'Hind', category: 'devanagari', weights: [300, 400, 500, 600, 700] },
  { family: 'Baloo 2', category: 'devanagari', weights: [400, 500, 600, 700, 800] },
  { family: 'Noto Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Tiro Devanagari Hindi', category: 'devanagari', weights: [400] },
]

export const DEFAULT_FONT = 'Poppins'

// Lazy font loader — call when a font is first used in canvas or selected
const loadedFonts = new Set<string>()
export function loadGoogleFont(family: string) {
  if (loadedFonts.has(family) || typeof document === 'undefined') return
  const slug = family.replace(/ /g, '+')
  const weights = GOOGLE_FONTS.find(f => f.family === family)?.weights ?? [400, 700]
  const weightStr = weights.join(';')
  const existing = document.querySelector(`link[data-font="${family}"]`)
  if (existing) { loadedFonts.add(family); return }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.setAttribute('data-font', family)
  link.href = `https://fonts.googleapis.com/css2?family=${slug}:wght@${weightStr}&display=swap`
  document.head.appendChild(link)
  loadedFonts.add(family)
}

// ==================== ID Generator ====================

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) +
         Math.random().toString(36).slice(2, 10)
}

// ==================== Default Layer Factories ====================

export function createBackgroundLayer(overrides?: Partial<BackgroundLayer>): BackgroundLayer {
  return {
    id: generateId(), type: 'background', name: 'Background',
    visible: true, locked: false,
    x: 0, y: 0, w: 100, h: 100,
    rotation: 0, opacity: 100, zIndex: 0,
    imageUrl: '', color: '#f3f4f6', gradient: '',
    objectFit: 'cover', objectPosition: 'center center',
    ...overrides,
  }
}

export function createImageLayer(overrides?: Partial<ImageLayer>): ImageLayer {
  return {
    id: generateId(), type: 'image', name: 'Image',
    visible: true, locked: false,
    x: 55, y: 5, w: 40, h: 88,
    rotation: 0, opacity: 100, zIndex: 20,
    imageUrl: '',
    objectFit: 'contain', objectPosition: 'bottom center',
    borderRadius: 0, dropShadow: false,
    ...overrides,
  }
}

export function createTextLayer(overrides?: Partial<TextLayer>): TextLayer {
  return {
    id: generateId(), type: 'text', name: 'Text',
    visible: true, locked: false,
    x: 5, y: 20, w: 50, h: 60,
    rotation: 0, opacity: 100, zIndex: 30,
    html: 'Your text here',
    fontFamily: 'Poppins', fontSize: 48, fontWeight: 700,
    lineHeight: 1.2, letterSpacing: 0,
    textAlign: 'left', verticalAlign: 'center',
    ...overrides,
  }
}

export function createShapeLayer(overrides?: Partial<ShapeLayer>): ShapeLayer {
  return {
    id: generateId(), type: 'shape', name: 'Shape',
    visible: true, locked: false,
    x: 0, y: 0, w: 50, h: 100,
    rotation: 0, opacity: 100, zIndex: 10,
    shape: 'gradient-overlay',
    fill: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 100%)',
    borderRadius: 0, borderWidth: 0, borderColor: 'transparent',
    ...overrides,
  }
}

export function createBadgeLayer(overrides?: Partial<BadgeLayer>): BadgeLayer {
  return {
    id: generateId(), type: 'badge', name: 'Badge',
    visible: true, locked: false,
    x: 5, y: 8, w: 20, h: 8,
    rotation: 0, opacity: 100, zIndex: 40,
    text: 'Ready by 6 PM', icon: '',
    fontFamily: 'Poppins', fontSize: 13, fontWeight: 600,
    bgColor: 'rgba(255,255,255,0.2)', textColor: '#ffffff',
    borderRadius: 999, paddingX: 12, paddingY: 4,
    borderWidth: 0, borderColor: 'transparent',
    ...overrides,
  }
}

export function createButtonLayer(overrides?: Partial<ButtonLayer>): ButtonLayer {
  return {
    id: generateId(), type: 'button', name: 'CTA Button',
    visible: true, locked: false,
    x: 5, y: 75, w: 25, h: 10,
    rotation: 0, opacity: 100, zIndex: 40,
    text: 'Order Now', href: '/category/cakes',
    fontFamily: 'Poppins', fontSize: 15, fontWeight: 600,
    bgColor: '#E91E63', textColor: '#ffffff',
    borderRadius: 999, paddingX: 24, paddingY: 10,
    borderWidth: 0, borderColor: 'transparent',
    ...overrides,
  }
}

// ==================== Migration Utility ====================

// Converts old banner column structure to layers array
// Called when banner.layers is empty but old fields exist
export function migrateOldBannerToLayers(banner: Record<string, unknown>): Layer[] {
  const layers: Layer[] = []

  // Always add background
  layers.push(createBackgroundLayer({
    imageUrl: (banner.imageUrl as string) || (banner.image_url as string) || '',
    zIndex: 0,
  }))

  // Overlay shape if overlayStyle set
  const overlayStyle = banner.overlayStyle as string | undefined
  if (overlayStyle && overlayStyle !== 'none') {
    const gradientMap: Record<string, string> = {
      'dark-left': 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, transparent 100%)',
      'dark-right': 'linear-gradient(to left, rgba(0,0,0,0.75) 0%, transparent 100%)',
      'full-dark': 'rgba(0,0,0,0.5)',
      'light-left': 'linear-gradient(to right, rgba(255,255,255,0.85) 0%, transparent 100%)',
      'light-right': 'linear-gradient(to left, rgba(255,255,255,0.85) 0%, transparent 100%)',
      'full-light': 'rgba(255,255,255,0.75)',
    }
    layers.push(createShapeLayer({
      name: 'Overlay',
      fill: gradientMap[overlayStyle] || 'rgba(0,0,0,0.4)',
      zIndex: 5,
      x: 0, y: 0, w: 100, h: 100,
    }))
  }

  // Hero image
  const heroUrl = (banner.heroImageUrl as string) || (banner.hero_image_url as string) || (banner.subjectImageUrl as string) || (banner.subject_image_url as string)
  if (heroUrl) {
    layers.push(createImageLayer({
      imageUrl: heroUrl,
      x: (banner.heroX as number) ?? 55,
      y: (banner.heroY as number) ?? 5,
      w: (banner.heroW as number) ?? 40,
      h: (banner.heroH as number) ?? 88,
      zIndex: 20,
    }))
  }

  // Badge
  const badgeText = (banner.badgeText as string) || (banner.badge_text as string)
  if (badgeText) {
    layers.push(createBadgeLayer({
      text: badgeText,
      bgColor: (banner.badgeBgColor as string) || 'rgba(255,255,255,0.2)',
      textColor: (banner.badgeTextColor as string) || '#ffffff',
      x: (banner.contentX as number) ?? 5,
      y: (banner.contentY as number) ?? 8,
      w: 22, h: 8,
      zIndex: 40,
    }))
  }

  // Title text
  const titleHtml = (banner.titleHtml as string) || (banner.title_html as string)
  if (titleHtml) {
    layers.push(createTextLayer({
      name: 'Title',
      html: titleHtml,
      fontSize: 48, fontWeight: 700,
      x: (banner.contentX as number) ?? 5,
      y: ((banner.contentY as number) ?? 10) + 10,
      w: (banner.contentW as number) ?? 50,
      h: 25,
      zIndex: 30,
    }))
  }

  // Subtitle text
  const subtitleHtml = (banner.subtitleHtml as string) || (banner.subtitle_html as string)
  if (subtitleHtml) {
    layers.push(createTextLayer({
      name: 'Subtitle',
      html: subtitleHtml,
      fontSize: 18, fontWeight: 400,
      x: (banner.contentX as number) ?? 5,
      y: ((banner.contentY as number) ?? 10) + 37,
      w: (banner.contentW as number) ?? 50,
      h: 15,
      zIndex: 30,
    }))
  }

  // CTA button
  const ctaText = (banner.ctaText as string) || (banner.cta_text as string)
  if (ctaText) {
    layers.push(createButtonLayer({
      text: ctaText,
      href: (banner.ctaLink as string) || (banner.cta_link as string) || '/',
      bgColor: (banner.ctaBgColor as string) || '#E91E63',
      textColor: (banner.ctaTextColor as string) || '#ffffff',
      x: (banner.contentX as number) ?? 5,
      y: ((banner.contentY as number) ?? 10) + 55,
      w: 22, h: 10,
      zIndex: 40,
    }))
  }

  return layers
}
