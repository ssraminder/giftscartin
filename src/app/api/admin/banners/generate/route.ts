// Required env vars: OPENAI_API_KEY, ANTHROPIC_API_KEY, REMOVE_BG_API_KEY (optional — skips bg removal if missing)
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { theme } = body as { theme: string }

    if (!theme?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Theme is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Create a job row
    const { data: job, error: insertError } = await supabase
      .from('banner_generation_jobs')
      .insert({ theme, status: 'pending' })
      .select()
      .single()

    if (insertError || !job) {
      console.error('Failed to create banner generation job:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create generation job' },
        { status: 500 }
      )
    }

    // Trigger the Netlify background function
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? 'https://giftscart.in'
    fetch(`${siteUrl}/.netlify/functions/generate-banner-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, jobId: job.id }),
    }).catch((err) => {
      console.error('Failed to invoke background function:', err)
    })

    return NextResponse.json({ success: true, jobId: job.id })
  } catch (error) {
    console.error('POST /api/admin/banners/generate error:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
