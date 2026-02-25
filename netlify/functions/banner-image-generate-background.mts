// Netlify Background Function — generates a single banner image (background or hero)
// The "-background" suffix makes Netlify treat this as async (up to 15 min timeout).
//
// Required env vars:
// OPENAI_API_KEY
// OPENAI_IMAGE_MODEL (optional, defaults to 'chatgpt-image-latest')
// NEXT_PUBLIC_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY

import type { BackgroundHandler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface JobPayload {
  jobId: string
  imageType: 'background' | 'hero'
  prompt: string
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

function buildPrompt(payload: JobPayload): string {
  const parts: string[] = []

  if (payload.imageType === 'background') {
    parts.push('Homepage banner background image for an Indian online gifting platform called Gifts Cart India.')
    parts.push('Style: photorealistic, warm colors, Indian aesthetic, no text, no watermarks, no logos, no people.')
  } else {
    parts.push('Hero product/subject image for an Indian online gifting platform banner.')
    parts.push('Style: product photography, subject centered, clean edges, suitable for PNG overlay on a banner, no text, no watermarks, no logos.')
  }

  if (payload.bannerContext?.titleHtml) {
    const titleText = stripHtmlTags(payload.bannerContext.titleHtml)
    if (titleText) {
      parts.push(`Banner theme: "${titleText}".`)
    }
  }

  if (payload.bannerContext?.occasion) {
    parts.push(`Occasion: ${payload.bannerContext.occasion}.`)
  }

  if (payload.bannerContext?.citySlug) {
    parts.push(`City context: ${payload.bannerContext.citySlug}, India.`)
  }

  parts.push(`User description: ${payload.prompt}`)

  return parts.join(' ')
}

export const handler: BackgroundHandler = async (event) => {
  const payload = JSON.parse(event.body ?? '{}') as JobPayload
  const { jobId, imageType } = payload
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'chatgpt-image-latest'

  try {
    // Mark as processing
    await supabase
      .from('banner_generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    const fullPrompt = buildPrompt(payload)

    // Background: 1536x1024 landscape, Hero: 1024x1536 portrait
    const size = imageType === 'background' ? '1536x1024' : '1024x1536'

    // Generate image via OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: fullPrompt,
        size,
        quality: 'high',
        n: 1,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI HTTP ${openaiResponse.status}: ${await openaiResponse.text()}`)
    }

    const openaiData = await openaiResponse.json()
    const base64Data = openaiData.data?.[0]?.b64_json
    if (!base64Data) throw new Error('No image data returned from OpenAI')

    // Upload to Supabase Storage (banners bucket)
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const storagePath = `${imageType}/${timestamp}-${random}.png`

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${storagePath}`

    // Mark done with result
    await supabase
      .from('banner_generation_jobs')
      .update({
        status: 'done',
        result: {
          imageUrl,
          storageKey: storagePath,
          model: imageModel,
          promptUsed: fullPrompt,
        },
      })
      .eq('id', jobId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    console.error('banner-image-generate-background error:', message)

    await supabase
      .from('banner_generation_jobs')
      .update({ status: 'failed', error: message })
      .eq('id', jobId)
  }
}
