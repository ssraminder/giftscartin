import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session?.role || !isAdminRole(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { siteName, faviconUrl } = body as {
      siteName?: string
      faviconUrl?: string
    }

    const supabase = getSupabaseAdmin()

    if (siteName !== undefined) {
      if (typeof siteName !== 'string' || siteName.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'siteName must be a non-empty string' },
          { status: 400 }
        )
      }
      if (siteName.length > 100) {
        return NextResponse.json(
          { success: false, error: 'siteName must be 100 characters or less' },
          { status: 400 }
        )
      }
      await supabase
        .from('platform_settings')
        .upsert(
          { key: 'site_name', value: siteName.trim(), updated_by: session.id, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
    }

    if (faviconUrl !== undefined) {
      if (faviconUrl !== null && typeof faviconUrl === 'string' && faviconUrl.length > 0) {
        if (!faviconUrl.startsWith('http://') && !faviconUrl.startsWith('https://')) {
          return NextResponse.json(
            { success: false, error: 'faviconUrl must start with http:// or https://' },
            { status: 400 }
          )
        }
        if (faviconUrl.length > 500) {
          return NextResponse.json(
            { success: false, error: 'faviconUrl must be 500 characters or less' },
            { status: 400 }
          )
        }
      }
      await supabase
        .from('platform_settings')
        .upsert(
          { key: 'favicon_url', value: faviconUrl || null, updated_by: session.id, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/admin/settings/general error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
