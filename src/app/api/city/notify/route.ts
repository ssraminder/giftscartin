import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod/v4'

const notifySchema = z.object({
  email: z.email().optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  cityName: z.string().min(1).max(200),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = notifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, phone, cityName } = parsed.data
    const supabase = getSupabaseAdmin()

    // Note: city_notifications uses @map columns: city_name, created_at
    await supabase
      .from('city_notifications')
      .insert({
        email: email || null,
        phone: phone || null,
        city_name: cityName,
      })

    // Increment notify count on the city if it exists
    // Note: cities uses @map columns: is_coming_soon, notify_count, display_name
    const { data: cities } = await supabase
      .from('cities')
      .select('id, notify_count')
      .or(`name.ilike.${cityName},slug.eq.${cityName.toLowerCase().replace(/\s+/g, '-')}`)
      .limit(1)

    if (cities && cities.length > 0) {
      const city = cities[0]
      await supabase
        .from('cities')
        .update({
          notify_count: (city.notify_count || 0) + 1,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', city.id)
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Notification registered successfully' },
    })
  } catch (error) {
    console.error('POST /api/city/notify error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register notification' },
      { status: 500 }
    )
  }
}
