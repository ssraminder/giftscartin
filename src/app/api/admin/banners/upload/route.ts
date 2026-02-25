import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const uploadType = (formData.get('type') as string) || 'background'

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: 'Invalid file type. Only PNG, JPG, and WebP are allowed.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: 'File too large. Max 5MB.' },
      { status: 400 }
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const supabase = getSupabaseAdmin()

  if (uploadType === 'hero') {
    // Hero image: upload as-is (background removal is a separate manual step)
    const heroFilename = `hero-${Date.now()}-${file.name}`
    const { error: heroError } = await supabase.storage
      .from('banners')
      .upload(heroFilename, buffer, { contentType: file.type, upsert: false })

    if (heroError) {
      return NextResponse.json({ success: false, error: heroError.message }, { status: 500 })
    }

    const heroUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${heroFilename}`

    return NextResponse.json({
      success: true,
      data: { url: heroUrl },
    })
  }

  // Default: background image upload (existing behaviour)
  const filename = `${Date.now()}-${file.name}`
  const { error } = await supabase.storage
    .from('banners')
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: {
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${filename}`,
    },
  })
}
