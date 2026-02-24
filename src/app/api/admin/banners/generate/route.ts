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
    const { theme, city } = body as { theme: string; city?: string }

    if (!theme || !theme.trim()) {
      return NextResponse.json(
        { success: false, error: 'theme is required' },
        { status: 400 }
      )
    }

    // Make two parallel API calls: image generation + content generation
    const [imageResult, contentResult] = await Promise.allSettled([
      // A) Image generation via OpenAI gpt-image-1
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'chatgpt-image-latest',
          prompt: `Premium gifting e-commerce banner for Indian market. Theme: ${theme}. Professional photography style, warm and celebratory mood, vibrant colors. Suitable as a wide hero banner background. No text or typography in the image.`,
          n: 1,
          size: '1536x1024',
        }),
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
Theme: ${theme}${city ? `. City: ${city}` : ''}

Return ONLY valid JSON, no markdown, no explanation:
{
  "titleHtml": "2-4 words with one <strong> wrap and optional <br/>",
  "subtitleHtml": "One benefit sentence, max 10 words, can use <strong> for emphasis",
  "ctaText": "2-3 word action button text",
  "badgeText": "Optional short pill text with emoji, or null"
}

Examples of good titleHtml:
- "<strong>Fresh Cakes,</strong><br/>Delivered Today"
- "Celebrate <em>Every</em><br/>Occasion"
- "Midnight<br/><strong>Surprises</strong>"
`,
          }],
        }),
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
        const supabase = getSupabaseAdmin()
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(filename, buffer, { contentType: 'image/png', upsert: false })

        if (uploadError) {
          console.error('Banner image upload error:', uploadError)
        } else {
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${filename}`
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
      return NextResponse.json(
        { success: false, error: 'Both image and content generation failed. Check API keys.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        titleHtml: content.titleHtml,
        subtitleHtml: content.subtitleHtml,
        ctaText: content.ctaText,
        badgeText: content.badgeText,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/banners/generate error:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
