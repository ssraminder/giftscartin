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

interface LayerContextSummary {
  backgroundColors?: string[]
  backgroundImageUrl?: string
  backgroundHasDarkTones?: boolean
  existingFonts?: string[]
  existingColors?: string[]
  textLayers?: { name: string; html: string; fontSize: number; color: string }[]
  imageLayerCount?: number
  occasionHint?: string
  dominantPalette?: string[]
}

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
  layerContext?: LayerContextSummary
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function buildContextAwarePrompt(
  imageType: 'background' | 'hero',
  userPrompt: string,
  layerContext?: LayerContextSummary
): string {
  const contextLines: string[] = []

  if (layerContext) {
    contextLines.push('Design context for this Indian gifting platform banner:')
    contextLines.push(`Theme/occasion: ${layerContext.occasionHint || 'general gifting'}`)

    if (imageType === 'background') {
      contextLines.push(
        'Generate a banner BACKGROUND image.',
        'Style: photorealistic, warm Indian aesthetic, no text, no people.',
        'Landscape orientation, 16:5 aspect ratio.',
      )
      if (layerContext.existingColors && layerContext.existingColors.length > 0) {
        contextLines.push(`Color palette to complement: ${layerContext.existingColors.slice(0, 3).join(', ')}`)
      } else {
        contextLines.push('Use warm, inviting colors.')
      }
      if (layerContext.textLayers && layerContext.textLayers.length > 0) {
        const mainText = stripHtmlTags(layerContext.textLayers[0].html).slice(0, 60)
        contextLines.push(`Banner promotes: "${mainText}" — image should evoke this.`)
      }
    }

    if (imageType === 'hero') {
      contextLines.push(
        'Generate a HERO/SUBJECT image to overlay on the banner.',
        'Requirements: transparent or clean background, subject centered,',
        'suitable as PNG overlay, product photography style.',
      )
      if (layerContext.backgroundHasDarkTones !== undefined) {
        contextLines.push(
          layerContext.backgroundHasDarkTones
            ? 'Background is dark — ensure subject has bright, vivid colors to stand out.'
            : 'Background is light — subject can use rich, deep colors.'
        )
      }
      if (layerContext.backgroundImageUrl) {
        contextLines.push('Subject should complement (not clash with) the background image mood.')
      }
    }
  }

  if (contextLines.length > 0) {
    return `${contextLines.join('\n')}\n\nSpecific request: ${userPrompt}`
  }

  return userPrompt
}

function buildPrompt(payload: JobPayload): string {
  // If layer context is provided, use the context-aware prompt builder
  if (payload.layerContext) {
    return buildContextAwarePrompt(payload.imageType, payload.prompt, payload.layerContext)
  }

  // Legacy prompt building (for backward compatibility)
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
