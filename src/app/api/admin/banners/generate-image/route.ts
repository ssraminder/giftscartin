import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { getSupabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

interface GenerateImageRequest {
  imageType: 'background' | 'hero'
  prompt: string
  currentImageUrl?: string
  referenceImageBase64?: string
  bannerContext?: {
    titleHtml?: string
    occasion?: string
    citySlug?: string
  }
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function buildPrompt(req: GenerateImageRequest): string {
  const parts: string[] = []

  if (req.imageType === 'background') {
    parts.push('Homepage banner background image for an Indian online gifting platform called Gifts Cart India.')
    parts.push('Style: photorealistic, warm colors, Indian aesthetic, no text, no watermarks, no logos, no people.')
  } else {
    parts.push('Hero product/subject image for an Indian online gifting platform banner.')
    parts.push('Style: product photography, subject centered, clean edges, suitable for PNG overlay on a banner, no text, no watermarks, no logos.')
  }

  if (req.bannerContext?.titleHtml) {
    const titleText = stripHtmlTags(req.bannerContext.titleHtml)
    if (titleText) {
      parts.push(`Banner theme: "${titleText}".`)
    }
  }

  if (req.bannerContext?.occasion) {
    parts.push(`Occasion: ${req.bannerContext.occasion}.`)
  }

  if (req.bannerContext?.citySlug) {
    parts.push(`City context: ${req.bannerContext.citySlug}, India.`)
  }

  parts.push(`User description: ${req.prompt}`)

  return parts.join(' ')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateImageRequest

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!body.imageType || !['background', 'hero'].includes(body.imageType)) {
      return NextResponse.json(
        { success: false, error: 'imageType must be "background" or "hero"' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const fullPrompt = buildPrompt(body)

    // Background: 1536x1024 landscape, Hero: 1024x1536 portrait
    const size = body.imageType === 'background' ? '1536x1024' : '1024x1536'

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: size as '1024x1024',
      quality: 'high',
      n: 1,
    })

    const imageData = imageResponse.data?.[0]
    if (!imageData?.b64_json) {
      throw new Error('No image data returned from OpenAI')
    }

    // Upload to Supabase storage
    const imageBuffer = Buffer.from(imageData.b64_json, 'base64')
    const supabase = getSupabaseAdmin()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const storagePath = `${body.imageType}/${timestamp}-${random}.png`

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      console.error('Banner image upload to Supabase failed:', uploadError.message)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${storagePath}`

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        storageKey: storagePath,
        model: 'gpt-image-1',
        promptUsed: fullPrompt,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/banners/generate-image error:', error)
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
