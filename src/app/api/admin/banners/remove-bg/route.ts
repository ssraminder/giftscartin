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

    let body: { imageUrl?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { imageUrl } = body
    if (!imageUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // Fetch the source image
    let imageBuffer: Buffer
    try {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch image: ${imgRes.status}` },
          { status: 400 }
        )
      }
      imageBuffer = Buffer.from(await imgRes.arrayBuffer())
    } catch (err: unknown) {
      const error = err as Error
      console.error('[remove-bg] Image fetch error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch source image' },
        { status: 400 }
      )
    }

    let resultBuffer: Buffer

    // Option A: Use remove.bg API if configured
    const removeBgKey = process.env.REMOVE_BG_API_KEY
    if (removeBgKey) {
      const removeBgForm = new FormData()
      removeBgForm.append(
        'image_file',
        new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }),
        'image.png'
      )
      removeBgForm.append('size', 'auto')

      const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': removeBgKey },
        body: removeBgForm,
      })

      if (!removeBgResponse.ok) {
        const errText = await removeBgResponse.text()
        console.error('[remove-bg] remove.bg API error:', removeBgResponse.status, errText)
        return NextResponse.json(
          { success: false, error: 'Background removal service returned an error' },
          { status: 502 }
        )
      }

      resultBuffer = Buffer.from(await removeBgResponse.arrayBuffer())
    } else if (process.env.OPENAI_API_KEY) {
      // Option B: Use OpenAI image edit as fallback
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const base64 = imageBuffer.toString('base64')
        const imageFile = new File(
          [Buffer.from(base64, 'base64')],
          'image.png',
          { type: 'image/png' }
        )

        const response = await openai.images.edit({
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
          image: imageFile,
          prompt:
            'Remove the background completely, make it fully transparent. Keep the main subject (cake, flowers, gift) perfectly intact with clean edges.',
          size: '1024x1024',
        })

        const resultBase64 = response.data?.[0]?.b64_json
        if (!resultBase64) {
          return NextResponse.json(
            { success: false, error: 'OpenAI returned no image data' },
            { status: 502 }
          )
        }
        resultBuffer = Buffer.from(resultBase64, 'base64')
      } catch (err: unknown) {
        const error = err as Error
        console.error('[remove-bg] OpenAI fallback error:', error?.message)
        return NextResponse.json(
          { success: false, error: error?.message || 'OpenAI background removal failed' },
          { status: 502 }
        )
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'No background removal service configured. Set REMOVE_BG_API_KEY or OPENAI_API_KEY.',
        },
        { status: 503 }
      )
    }

    // Upload to Supabase storage
    const supabase = getSupabaseAdmin()
    const fileName = `hero-nobg/${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, resultBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('[remove-bg] Upload error:', uploadError.message)
      return NextResponse.json(
        { success: false, error: 'Failed to upload processed image' },
        { status: 500 }
      )
    }

    const resultUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${fileName}`

    return NextResponse.json({ success: true, resultUrl })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[remove-bg] Error:', error?.message, error?.stack)
    return NextResponse.json(
      { success: false, error: error?.message || 'Background removal failed' },
      { status: 500 }
    )
  }
}
