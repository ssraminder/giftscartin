// Vendor categories that require FSSAI license
export const FOOD_CATEGORIES = ['cakes', 'sweets', 'pastries', 'chocolates'] as const

// Check if a vendor's categories include any food category
export function requiresFssai(categories: string[]): boolean {
  return categories.some(cat => FOOD_CATEGORIES.includes(cat as typeof FOOD_CATEGORIES[number]))
}

// GST number format: 15-char alphanumeric (e.g., 22AAAAA0000A1Z5)
export const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/

// FSSAI license number: 14-digit number
export const FSSAI_REGEX = /^\d{14}$/
