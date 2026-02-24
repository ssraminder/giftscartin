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
    // Hero image flow: upload original, then call remove.bg, upload result
    const originalFilename = `hero-original-${Date.now()}-${file.name}`
    const { error: origError } = await supabase.storage
      .from('banners')
      .upload(originalFilename, buffer, { contentType: file.type, upsert: false })

    if (origError) {
      return NextResponse.json({ success: false, error: origError.message }, { status: 500 })
    }

    const originalUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${originalFilename}`

    // Check if remove.bg API key is available
    const removeBgKey = process.env.REMOVE_BG_API_KEY
    if (!removeBgKey) {
      return NextResponse.json({
        success: true,
        data: {
          url: originalUrl,
          originalUrl,
          warning: 'REMOVE_BG_API_KEY not configured — original image used without background removal',
        },
      })
    }

    try {
      // Call remove.bg API
      const removeBgForm = new FormData()
      removeBgForm.append('image_file', new Blob([buffer], { type: file.type }), 'image.png')
      removeBgForm.append('size', 'auto')

      const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': removeBgKey },
        body: removeBgForm,
      })

      if (!removeBgResponse.ok) {
        const errText = await removeBgResponse.text()
        console.error('remove.bg API error:', removeBgResponse.status, errText)
        return NextResponse.json({
          success: true,
          data: {
            url: originalUrl,
            originalUrl,
            warning: 'Background removal failed — original image used',
          },
        })
      }

      const resultBuffer = Buffer.from(await removeBgResponse.arrayBuffer())
      const transparentFilename = `hero-${Date.now()}.png`

      const { error: transError } = await supabase.storage
        .from('banners')
        .upload(transparentFilename, resultBuffer, { contentType: 'image/png', upsert: false })

      if (transError) {
        console.error('Failed to upload transparent image:', transError.message)
        return NextResponse.json({
          success: true,
          data: {
            url: originalUrl,
            originalUrl,
            warning: 'Failed to save processed image — original image used',
          },
        })
      }

      const transparentUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${transparentFilename}`

      return NextResponse.json({
        success: true,
        data: {
          url: transparentUrl,
          originalUrl,
        },
      })
    } catch (err) {
      console.error('remove.bg processing error:', err)
      return NextResponse.json({
        success: true,
        data: {
          url: originalUrl,
          originalUrl,
          warning: 'Background removal failed — original image used',
        },
      })
    }
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
