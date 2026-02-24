// Required env vars:
// OPENAI_API_KEY
// OPENAI_IMAGE_MODEL (optional, defaults to 'chatgpt-image-latest')
// ANTHROPIC_API_KEY
// NEXT_PUBLIC_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// REMOVE_BG_API_KEY (optional, skips bg removal if missing)

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
      Slightly out of focus, atmospheric, suitable as a background layer.
      --no text, no logos, no watermarks, no people
    `,
    flowers: `
      Commercial photography for a premium Indian flower delivery platform.
      Scene: Lush arrangement of fresh red roses, white lilies, and pink peonies
      in a crystal vase. Soft morning light from the left, warm bokeh background
      of greens and golds. Water droplets on petals suggesting freshness.
      A few loose petals scattered on the white marble surface below.
      Camera angle: slightly above eye level, tilted 10 degrees.
      Style: FNP / Interflora hero banner photography, ultra-premium, editorial.
      Aspect ratio 16:9 landscape. Slightly blurred, atmospheric background layer.
      --no text, no logos, no watermarks, no people
    `,
    midnight: `
      Dramatic nighttime luxury gifting photography for an Indian platform.
      Scene: Elegant black gift box with gold ribbon, a lit sparkler creating
      light trails, a slice of dark chocolate cake on a slate board, and a small
      bouquet of red roses. Set on a dark navy/black velvet surface.
      Lighting: single candle glow + sparkler light trails + city bokeh lights
      visible through a blurred window in background. Moody, cinematic, dramatic.
      Style: high-end luxury gifting editorial. Deep shadows, rich contrast.
      Aspect ratio 16:9 landscape. Slightly out of focus, atmospheric background.
      --no text, no logos, no watermarks, no people
    `,
    anniversary: `
      Romantic luxury photography for an Indian anniversary gifting platform.
      Scene: Red roses in a tall glass vase, a heart-shaped chocolate cake on
      a cake stand, champagne flutes with sparkling juice, scattered rose petals
      on a white linen tablecloth. Warm candlelight + bokeh fairy lights in
      background creating a romantic golden atmosphere.
      Style: premium lifestyle editorial, soft and warm tones, romantic depth.
      Aspect ratio 16:9 landscape. Slightly blurred, atmospheric background layer.
      --no text, no logos, no watermarks, no people
    `,
    birthday: `
      Joyful premium birthday gifting photography for an Indian platform.
      Scene: Tall 3-tier birthday cake with colourful macarons on top and
      dripping ganache. Surrounded by wrapped gift boxes with ribbons,
      gold and pink balloons blurred in background, confetti on the surface.
      Lighting: bright, airy, celebratory. White and pastel background.
      Style: Winni.in / FNP premium editorial birthday photography.
      Aspect ratio 16:9 landscape. Slightly out of focus, atmospheric background.
      --no text, no logos, no watermarks, no people
    `,
    corporate: `
      Premium corporate gifting photography for an Indian B2B platform.
      Scene: Sophisticated flat lay — branded gift hamper box open showing
      premium dry fruits, chocolates, a journal, and a pen on a dark walnut
      desk. Beside it: a curated cake box, and a small succulent plant.
      Lighting: clean overhead studio light, minimal shadows.
      Style: LinkedIn / corporate brand editorial, clean and professional.
      Neutral tones — charcoal, cream, gold accents.
      Aspect ratio 16:9 landscape. Slightly blurred, atmospheric background.
      --no text, no logos, no watermarks, no people
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
    Aspect ratio 16:9 landscape. Slightly out of focus, atmospheric background layer.
    --no text, no logos, no watermarks, no people
  `.trim()
}

function buildSubjectPrompt(theme: string): string {
  const lower = theme.toLowerCase()

  if (lower.includes('midnight')) {
    return 'An elegant black fondant cake with gold accents and sparklers, pure white background, no shadows, photorealistic, centered'
  }
  if (lower.includes('anniversary')) {
    return 'A romantic two-tier white wedding cake with roses, pure white background, no shadows, photorealistic, centered'
  }
  if (lower.includes('corporate') || lower.includes('gifting')) {
    return 'A premium gift hamper box with ribbon, pure white background, no shadows, photorealistic, professional product photography, centered'
  }
  if (lower.includes('mother') || lower.includes('maa')) {
    return "A beautiful pink and white floral cake with 'Happy Mother\\'s Day' topper, pure white background, no shadows, photorealistic, centered"
  }
  if (lower.includes('flower') || lower.includes('rose')) {
    return 'A luxurious bouquet of fresh flowers, pure white background, no shadows, photorealistic, professional product photography, centered, vibrant colors'
  }
  if (lower.includes('cake') || lower.includes('birthday')) {
    return 'A single stunning celebration cake, overhead 3/4 angle, pure white background, no shadows, photorealistic, professional food photography, centered'
  }

  // Default fallback
  return 'A premium gift arrangement, pure white background, no shadows, photorealistic, professional product photography, centered'
}

export const handler: BackgroundHandler = async (event) => {
  const { theme, jobId } = JSON.parse(event.body ?? '{}')
  const imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'chatgpt-image-latest'

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

CTA LINK RULES (ctaLink):
- Infer from theme:
  - cakes → /category/cakes
  - flowers → /category/flowers
  - midnight → /category/midnight-delivery
  - corporate → /corporate-gifting
  - birthday → /category/birthday-cakes
  - anniversary → /category/anniversary-cakes
  - default → /

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
  "ctaLink": "...",
  "secondaryCtaText": "View All",
  "secondaryCtaLink": "/",
  "badgeText": "...",
  "overlayStyle": "dark-left",
  "textPosition": "left"
}
`

    // Run three tasks in parallel: background image, subject image, copy text
    const [bgResult, subjectResult, contentResult] = await Promise.allSettled([
      // Task A — Background image (OpenAI gpt-image-1)
      (async () => {
        const bgImageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: buildImagePrompt(theme),
            size: '1536x1024',
            quality: 'high',
            n: 1,
          }),
        })

        if (!bgImageResponse.ok) {
          throw new Error(`OpenAI bg image HTTP ${bgImageResponse.status}: ${await bgImageResponse.text()}`)
        }

        const bgImageData = await bgImageResponse.json()
        const bgBase64 = bgImageData.data?.[0]?.b64_json
        if (!bgBase64) throw new Error('No b64_json in background image response')

        const bgBuffer = Buffer.from(bgBase64, 'base64')
        const bgFileName = `bg-${jobId}.png`
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(bgFileName, bgBuffer, { contentType: 'image/png', upsert: true })

        if (uploadError) throw new Error(`Background upload failed: ${uploadError.message}`)

        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${bgFileName}`
      })(),

      // Task B — Hero/subject image (OpenAI gpt-image-1 → remove.bg)
      (async () => {
        const subjectImageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: imageModel,
            prompt: buildSubjectPrompt(theme),
            size: '1024x1024',
            quality: 'high',
            n: 1,
          }),
        })

        if (!subjectImageResponse.ok) {
          throw new Error(`OpenAI subject image HTTP ${subjectImageResponse.status}: ${await subjectImageResponse.text()}`)
        }

        const subjectImageData = await subjectImageResponse.json()
        const subjectBase64 = subjectImageData.data?.[0]?.b64_json
        if (!subjectBase64) throw new Error('No b64_json in subject image response')

        const subjectBuffer = Buffer.from(subjectBase64, 'base64')

        // Pass through remove.bg to strip background
        let finalSubjectBuffer = subjectBuffer

        if (process.env.REMOVE_BG_API_KEY) {
          try {
            const removeBgForm = new FormData()
            removeBgForm.append('image_file', new Blob([subjectBuffer], { type: 'image/png' }), 'subject.png')
            removeBgForm.append('size', 'auto')

            const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
              method: 'POST',
              headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
              body: removeBgForm,
            })

            if (removeBgResponse.ok) {
              finalSubjectBuffer = Buffer.from(await removeBgResponse.arrayBuffer())
            }
          } catch (e) {
            // remove.bg failed — use original with white bg
            console.error('remove.bg failed, using original:', e)
          }
        }

        // Upload to banners bucket
        const subjectFileName = `subject-${jobId}.png`
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(subjectFileName, finalSubjectBuffer, { contentType: 'image/png', upsert: true })

        if (uploadError) throw new Error(`Subject upload failed: ${uploadError.message}`)

        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${subjectFileName}`
      })(),

      // Task C — Copy text (Claude)
      (async () => {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: contentPrompt,
            }],
          }),
        })

        if (!claudeResponse.ok) {
          throw new Error(`Claude HTTP ${claudeResponse.status}: ${await claudeResponse.text()}`)
        }

        const contentData = await claudeResponse.json()
        const raw = contentData.content?.[0]?.text?.replace(/```json|```/g, '').trim()
        if (!raw) throw new Error('Empty Claude response')

        return JSON.parse(raw) as {
          titleHtml: string
          subtitleHtml: string
          ctaText: string
          ctaLink: string
          secondaryCtaText: string
          secondaryCtaLink: string
          badgeText: string
          overlayStyle: string
          textPosition: string
        }
      })(),
    ])

    // Check if ALL three failed
    if (bgResult.status === 'rejected' && subjectResult.status === 'rejected' && contentResult.status === 'rejected') {
      const errors = [
        `BG: ${bgResult.reason}`,
        `Subject: ${subjectResult.reason}`,
        `Copy: ${contentResult.reason}`,
      ].join('; ')
      await supabase.from('banner_generation_jobs')
        .update({ status: 'failed', error: errors })
        .eq('id', jobId)
      return
    }

    // Extract results (null if that task failed)
    const bgUrl = bgResult.status === 'fulfilled' ? bgResult.value : null
    const subjectUrl = subjectResult.status === 'fulfilled' ? subjectResult.value : null
    const copyData = contentResult.status === 'fulfilled' ? contentResult.value : null

    // Log individual failures
    if (bgResult.status === 'rejected') console.error('Background image failed:', bgResult.reason)
    if (subjectResult.status === 'rejected') console.error('Subject image failed:', subjectResult.reason)
    if (contentResult.status === 'rejected') console.error('Copy generation failed:', contentResult.reason)

    // Build result object
    const result = {
      imageUrl: bgUrl,
      subjectImageUrl: subjectUrl,
      titleHtml: copyData?.titleHtml || null,
      subtitleHtml: copyData?.subtitleHtml || null,
      ctaText: copyData?.ctaText || null,
      ctaLink: copyData?.ctaLink || null,
      secondaryCtaText: copyData?.secondaryCtaText || null,
      secondaryCtaLink: copyData?.secondaryCtaLink || null,
      badgeText: copyData?.badgeText || null,
      overlayStyle: copyData?.overlayStyle || null,
      textPosition: copyData?.textPosition || null,
    }

    await supabase.from('banner_generation_jobs')
      .update({ status: 'done', result })
      .eq('id', jobId)

  } catch (error) {
    console.error('Banner generation background function error:', error)
    await supabase.from('banner_generation_jobs')
      .update({ status: 'failed', error: String(error) })
      .eq('id', jobId)
  }
}
