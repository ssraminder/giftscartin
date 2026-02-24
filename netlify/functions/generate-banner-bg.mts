import type { BackgroundHandler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const handler: BackgroundHandler = async (event) => {
  const { theme, jobId } = JSON.parse(event.body ?? '{}')

  try {
    // Update job status to processing
    await supabase.from('banner_generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Generate image and content in parallel
    const [imageResult, contentResult] = await Promise.allSettled([
      // A) Image generation via OpenAI gpt-image-1
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: `Premium gifting e-commerce banner for Indian market. Theme: ${theme}.
                   Professional photography style, warm celebratory mood, vibrant colors.
                   Wide hero banner background. No text or typography in the image.`,
          n: 1,
          size: '1536x1024',
        })
      }),

      // B) Content generation via Anthropic Claude
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Generate homepage banner copy for an Indian gifting platform (GiftsCart).
Theme: ${theme}

Return ONLY valid JSON, no markdown:
{
  "titleHtml": "2-4 words with one <strong> wrap and optional <br/>",
  "subtitleHtml": "One benefit sentence max 10 words, can use <strong>",
  "ctaText": "2-3 word action button text",
  "badgeText": "Short pill text with emoji, or null"
}`
          }]
        })
      }),
    ])

    // Process image result
    let imageUrl = ''
    if (imageResult.status === 'fulfilled' && imageResult.value.ok) {
      const imageData = await imageResult.value.json()
      const base64Image = imageData.data?.[0]?.b64_json
      if (base64Image) {
        const buffer = Buffer.from(base64Image, 'base64')
        const filename = `ai-${Date.now()}.png`
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(filename, buffer, { contentType: 'image/png', upsert: false })

        if (!uploadError) {
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${filename}`
        } else {
          console.error('Banner image upload error:', uploadError)
        }
      }
    } else {
      const reason = imageResult.status === 'rejected'
        ? imageResult.reason
        : `HTTP ${imageResult.value.status}`
      console.error('Image generation failed:', reason)
    }

    // Process content result
    let content = {
      titleHtml: '',
      subtitleHtml: '',
      ctaText: 'Shop Now',
      badgeText: null as string | null,
    }
    if (contentResult.status === 'fulfilled' && contentResult.value.ok) {
      const contentData = await contentResult.value.json()
      const raw = contentData.content?.[0]?.text?.replace(/```json|```/g, '').trim()
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          content = {
            titleHtml: parsed.titleHtml || '',
            subtitleHtml: parsed.subtitleHtml || '',
            ctaText: parsed.ctaText || 'Shop Now',
            badgeText: parsed.badgeText || null,
          }
        } catch (parseError) {
          console.error('Failed to parse Claude response:', parseError)
        }
      }
    } else {
      const reason = contentResult.status === 'rejected'
        ? contentResult.reason
        : `HTTP ${contentResult.value.status}`
      console.error('Content generation failed:', reason)
    }

    // Check if at least one succeeded
    if (!imageUrl && !content.titleHtml) {
      await supabase.from('banner_generation_jobs')
        .update({ status: 'failed', error: 'Both image and content generation failed. Check API keys.' })
        .eq('id', jobId)
      return
    }

    // Update job with results
    await supabase.from('banner_generation_jobs')
      .update({
        status: 'done',
        result: { imageUrl, ...content }
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('Banner generation background function error:', error)
    await supabase.from('banner_generation_jobs')
      .update({ status: 'failed', error: String(error) })
      .eq('id', jobId)
  }
}
