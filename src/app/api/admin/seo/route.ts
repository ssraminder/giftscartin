import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { z } from 'zod'

const updateSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteDescription: z.string().optional(),
  defaultOgImage: z.string().url().nullable().optional(),
  googleVerification: z.string().nullable().optional(),
  robotsTxt: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data: settings } = await supabase
      .from('seo_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('GET /api/admin/seo error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch SEO settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('seo_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    let settings
    if (existing) {
      const { data, error } = await supabase
        .from('seo_settings')
        .update({ ...parsed.data, updatedAt: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      settings = data
    } else {
      const { data, error } = await supabase
        .from('seo_settings')
        .insert(parsed.data)
        .select()
        .single()
      if (error) throw error
      settings = data
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('PUT /api/admin/seo error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update SEO settings' }, { status: 500 })
  }
}
