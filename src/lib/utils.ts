import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number | string | { toNumber(): number }): string {
  const num = typeof amount === 'object' && amount !== null ? amount.toNumber() : Number(amount)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(num)
}

export function generateOrderNumber(cityCode: string): string {
  const random = Math.floor(10000 + Math.random() * 90000)
  return `GC-${cityCode}-${random}`
}

/**
 * Append Supabase image transform params for resizing.
 * For non-Supabase URLs, returns the URL as-is.
 */
export function processImageUrl(url: string, width = 600, quality = 75): string {
  if (!url) return '/placeholder-product.svg'

  // If it's a Supabase storage URL, use their transform API
  if (url.includes('supabase.co/storage')) {
    const renderUrl = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    )
    return `${renderUrl}?width=${width}&quality=${quality}&resize=contain`
  }

  return url
}
