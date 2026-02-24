import type { BackgroundHandler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function buildImagePrompt(theme: string): string {
  const themePrompts: Record<string, string> = {
    cakes: `
      Commercial product photography for a premium Indian bakery delivery platform.
      Scene: 2-3 stunning celebration cakes artfully arranged — a tall layered
      chocolate drip cake, a pastel floral fondant cake, and a fruit-topped fresh
      cream cake. Shot on a luxurious dark marble surface with warm golden bokeh
      lights in the background. Soft studio lighting with a warm fill light from
      the right. Garnishes: fresh berries, edible gold leaf, rose petals scattered
      around the base. Depth of field: foreground cake sharp, background soft blur.
      Camera angle: 30 degrees above eye level. Aspect ratio 16:9 landscape.
      Style: Zomato / Swiggy Instamart premium product photography.
      NO text, NO watermarks, NO logos, NO people.
    `,
    flowers: `
      Commercial photography for a premium Indian flower delivery platform.
      Scene: Lush arrangement of fresh red roses, white lilies, and pink peonies
      in a crystal vase. Soft morning light from the left, warm bokeh background
      of greens and golds. Water droplets on petals suggesting freshness.
      A few loose petals scattered on the white marble surface below.
      Camera angle: slightly above eye level, tilted 10 degrees.
      Style: FNP / Interflora hero banner photography, ultra-premium, editorial.
      Aspect ratio 16:9 landscape.
      NO text, NO watermarks, NO logos, NO people.
    `,
    midnight: `
      Dramatic nighttime luxury gifting photography for an Indian platform.
      Scene: Elegant black gift box with gold ribbon, a lit sparkler creating
      light trails, a slice of dark chocolate cake on a slate board, and a small
      bouquet of red roses. Set on a dark navy/black velvet surface.
      Lighting: single candle glow + sparkler light trails + city bokeh lights
      visible through a blurred window in background. Moody, cinematic, dramatic.
      Style: high-end luxury gifting editorial. Deep shadows, rich contrast.
      Aspect ratio 16:9 landscape.
      NO text, NO watermarks, NO logos, NO people.
    `,
    anniversary: `
      Romantic luxury photography for an Indian anniversary gifting platform.
      Scene: Red roses in a tall glass vase, a heart-shaped chocolate cake on
      a cake stand, champagne flutes with sparkling juice, scattered rose petals
      on a white linen tablecloth. Warm candlelight + bokeh fairy lights in
      background creating a romantic golden atmosphere.
      Style: premium lifestyle editorial, soft and warm tones, romantic depth.
      Aspect ratio 16:9 landscape.
      NO text, NO watermarks, NO logos, NO people.
    `,
    birthday: `
      Joyful premium birthday gifting photography for an Indian platform.
      Scene: Tall 3-tier birthday cake with colourful macarons on top and
      dripping ganache. Surrounded by wrapped gift boxes with ribbons,
      gold and pink balloons blurred in background, confetti on the surface.
      Lighting: bright, airy, celebratory. White and pastel background.
      Style: Winni.in / FNP premium editorial birthday photography.
      Aspect ratio 16:9 landscape.
      NO text, NO watermarks, NO logos, NO people.
    `,
    corporate: `
      Premium corporate gifting photography for an Indian B2B platform.
      Scene: Sophisticated flat lay — branded gift hamper box open showing
      premium dry fruits, chocolates, a journal, and a pen on a dark walnut
      desk. Beside it: a curated cake box, and a small succulent plant.
      Lighting: clean overhead studio light, minimal shadows.
      Style: LinkedIn / corporate brand editorial, clean and professional.
      Neutral tones — charcoal, cream, gold accents.
      Aspect ratio 16:9 landscape.
      NO text, NO watermarks, NO logos, NO people.
    `,
  }

  // Match theme keyword to a known prompt, fallback to a generic premium prompt
  const key = Object.keys(themePrompts).find(k => theme.toLowerCase().includes(k))

  if (key) return themePrompts[key].trim()

  // Generic fallback
  return `
    Ultra-premium commercial photography for an Indian gifting platform.
    Scene: Beautiful arrangement of celebration cakes, fresh flowers and
    wrapped gift boxes on a luxurious marble surface. Warm golden bokeh
    background. Professional studio lighting, soft shadows, rich colours.
    Style: FNP / Winni premium hero banner photography.
    Aspect ratio 16:9 landscape.
    NO text, NO watermarks, NO logos, NO people.
  `.trim()
}

export const handler: BackgroundHandler = async (event) => {
  const { theme, jobId } = JSON.parse(event.body ?? '{}')

  try {
    // Update job status to processing
    await supabase.from('banner_generation_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    const contentPrompt = `
You are a senior conversion copywriter for GiftsCart India — a premium
same-day cake, flower and gift delivery platform serving Chandigarh,
Mohali and Panchkula.

Generate compelling banner copy for this theme: "${theme}"

TITLE RULES (titleHtml):
- Exactly 2 lines separated by <br/>
- Max 4-5 words total
- Use <strong> on the most emotionally powerful phrase
- First line: the WHAT (product/occasion)
- Second line: the EMOTIONAL HOOK or URGENCY
- Examples of GREAT titles:
  "Celebrate With<br/><strong>Fresh Cakes</strong>"
  "<strong>Midnight Gifts,</strong><br/>Right On Time"
  "Flowers That<br/><strong>Say It All</strong>"
  "<strong>Birthday Cakes</strong><br/>Delivered Today"
- NEVER use: "Shop Now", "Order Today", "Get Now" in the title

SUBTITLE RULES (subtitleHtml):
- One line, max 10 words
- Include ONE specific operational detail in <strong>: time, cutoff, city
- Examples:
  "Order by <strong>6 PM</strong> for same-day delivery in Chandigarh"
  "Fresh from local bakers — delivered in <strong>3 hours</strong>"
  "Midnight delivery available till <strong>10 PM</strong> booking"

CTA RULES (ctaText):
- 2-4 words, action verb first, specific to the theme
- Good: "Order a Cake", "Send Flowers Now", "Book Midnight Delivery", "Explore Gifts"
- Bad: "Shop Now", "Click Here", "Buy Now", "Order Now"

BADGE RULES (badgeText):
- Start with a relevant emoji
- 3-5 words max, highly specific
- Good: "🎂 Ready by 6 PM", "🌹 Fresh Cut Daily", "🌙 Midnight Available", "⚡ 3-Hour Delivery"
- Bad: "Same Day Available", "Order Now", "Free Delivery"

LAYOUT RULES:
- overlayStyle: "dark-left" if image subject is on RIGHT side of frame
                "dark-right" if image subject is on LEFT side of frame
                "full-dark" for centred compositions
- textPosition: always OPPOSITE side from main image subject

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "titleHtml": "...",
  "subtitleHtml": "...",
  "ctaText": "...",
  "secondaryCtaText": "Browse All",
  "badgeText": "...",
  "overlayStyle": "dark-left",
  "textPosition": "left"
}
`

    // Generate image and content in parallel
    const [imageResult, contentResult] = await Promise.allSettled([
      // A) Image generation via OpenAI chatgpt-image-latest
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'chatgpt-image-latest',
          prompt: buildImagePrompt(theme),
          n: 1,
          size: '1792x1024',
          quality: 'high',
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
            content: contentPrompt,
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
      ctaText: 'Order a Cake',
      secondaryCtaText: 'Browse All',
      badgeText: null as string | null,
      overlayStyle: 'dark-left',
      textPosition: 'left',
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
            ctaText: parsed.ctaText || 'Order a Cake',
            secondaryCtaText: parsed.secondaryCtaText || 'Browse All',
            badgeText: parsed.badgeText || null,
            overlayStyle: parsed.overlayStyle || 'dark-left',
            textPosition: parsed.textPosition || 'left',
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
