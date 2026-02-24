import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('banner_generation_jobs')
      .select('status, result, error')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/admin/banners/generate/[jobId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
