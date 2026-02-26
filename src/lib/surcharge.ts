import { getSupabaseAdmin } from '@/lib/supabase'

export interface SurchargeResult {
  id: string
  name: string
  amount: number
  appliesTo: string
}

/**
 * Fetch active platform surcharges for a given delivery date and city.
 * Returns surcharges that apply to all cities (city_id IS NULL) or the specific city.
 */
export async function getPlatformSurcharges(
  date: Date,
  cityId: string
): Promise<SurchargeResult[]> {
  const supabase = getSupabaseAdmin()
  const dateStr = date.toISOString()

  const { data, error } = await supabase
    .from('delivery_surcharges')
    .select('id, name, amount, appliesTo')
    .eq('isActive', true)
    .lte('startDate', dateStr)
    .gte('endDate', dateStr)
    .or(`city_id.is.null,city_id.eq.${cityId}`)

  if (error) {
    console.error('Failed to fetch surcharges:', error)
    return []
  }

  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    appliesTo: s.appliesTo,
  }))
}

/**
 * Calculate total surcharge and breakdown from a list of surcharges,
 * filtered by delivery slot and product categories.
 *
 * appliesTo values:
 *  - 'all'              → always included
 *  - 'slot:<slug>'      → included when slotSlug matches
 *  - 'category:<slug>'  → included when categoryIds contains the slug
 */
export function calculatePlatformSurcharge(
  surcharges: SurchargeResult[],
  slotSlug: string,
  categoryIds: string[]
): { total: number; breakdown: { name: string; amount: number }[] } {
  const breakdown: { name: string; amount: number }[] = []

  for (const surcharge of surcharges) {
    const { appliesTo } = surcharge

    if (appliesTo === 'all') {
      breakdown.push({ name: surcharge.name, amount: surcharge.amount })
    } else if (appliesTo.startsWith('slot:')) {
      const slug = appliesTo.slice(5)
      if (slug === slotSlug) {
        breakdown.push({ name: surcharge.name, amount: surcharge.amount })
      }
    } else if (appliesTo.startsWith('category:')) {
      const categorySlug = appliesTo.slice(9)
      if (categoryIds.includes(categorySlug)) {
        breakdown.push({ name: surcharge.name, amount: surcharge.amount })
      }
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0)

  return { total, breakdown }
}
