import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { formatContextForAI } from '@/lib/banner-layers'
import type { LayerContextSummary } from '@/lib/banner-layers'
import Anthropic from '@anthropic-ai/sdk'

// GET health check — verify route is reachable and env var is set
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyPrefix: process.env.ANTHROPIC_API_KEY
      ? process.env.ANTHROPIC_API_KEY.slice(0, 7) + '...'
      : 'NOT SET',
  })
}

// Helper to parse AI JSON response
function parseAIResponse(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

// Helper to extract raw text from Anthropic response
function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('')
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const user = await getSessionFromRequest(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse body
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const {
      titleHtml,
      subtitleHtml,
      ctaText,
      styleInstruction,
      backgroundImageUrl,
      overlayStyle,
      currentColors,
      mode,
      target,
      layerContext,
    } = body as {
      titleHtml?: string
      subtitleHtml?: string
      ctaText?: string
      styleInstruction?: string
      backgroundImageUrl?: string
      overlayStyle?: string
      currentColors?: string[]
      mode?: string
      target?: 'title' | 'subtitle' | 'both'
      layerContext?: LayerContextSummary
    }

    if (!styleInstruction?.trim()) {
      return NextResponse.json(
        { success: false, error: 'styleInstruction is required' },
        { status: 400 }
      )
    }

    // Build context block from layer context
    const contextBlock = layerContext
      ? `\n\nBanner design context (use this to make informed styling decisions):\n${formatContextForAI(layerContext)}`
      : ''

    // Anthropic client
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // ==================== generate_copy mode ====================
    if (mode === 'generate_copy') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a copywriter for an Indian gifting platform (Gifts Cart India).
Write banner text that is punchy, emotional, and relevant to the occasion.
Return ONLY valid JSON:
{"titleHtml":"...","subtitleHtml":"...","explanation":"...","suggestedColors":["#hex1","#hex2"]}`,
        messages: [{
          role: 'user',
          content: `Write banner copy for: ${styleInstruction}${contextBlock}
Title: 1-5 words, bold and emotional. Use <strong> for emphasis, <span style="color:..."> for colors.
Subtitle: 1 short sentence, practical benefit.
Use <strong> for emphasis, <br/> for line breaks.

Important:
- If background is dark, use light/white text colors
- If background is light, use dark text colors
- Match or complement the existing color palette
- Return ONLY valid JSON, no markdown`,
        }],
      })

      const rawText = extractText(response)
      try {
        const parsed = parseAIResponse(rawText) as {
          titleHtml: string; subtitleHtml: string; explanation: string; suggestedColors: string[]
        }
        return NextResponse.json({
          success: true,
          data: {
            titleHtml: parsed.titleHtml || '',
            subtitleHtml: parsed.subtitleHtml || '',
            explanation: parsed.explanation || '',
            suggestedColors: parsed.suggestedColors || [],
          },
        })
      } catch {
        console.error('[style-text] generate_copy JSON parse failed:', rawText)
        return NextResponse.json(
          { success: false, error: 'AI returned invalid response' },
          { status: 500 }
        )
      }
    }

    // ==================== badge mode ====================
    if (mode === 'badge') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are a UI copywriter for Indian gifting banners.
Return ONLY valid JSON:
{"text":"Ready by 6 PM","icon":"emoji","bgColor":"rgba(255,255,255,0.2)","textColor":"#ffffff","borderRadius":999,"explanation":"..."}`,
        messages: [{
          role: 'user',
          content: `Suggest a badge/pill label. ${styleInstruction}${contextBlock}
Max 4 words, include relevant emoji. Colors must contrast with background.`,
        }],
      })

      const rawText = extractText(response)
      try {
        const parsed = parseAIResponse(rawText) as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: {
            text: parsed.text || 'Special Offer',
            icon: parsed.icon || '',
            bgColor: parsed.bgColor || 'rgba(255,255,255,0.2)',
            textColor: parsed.textColor || '#ffffff',
            borderRadius: parsed.borderRadius ?? 999,
            explanation: parsed.explanation || '',
          },
        })
      } catch {
        console.error('[style-text] badge JSON parse failed:', rawText)
        return NextResponse.json(
          { success: false, error: 'AI returned invalid badge response' },
          { status: 500 }
        )
      }
    }

    // ==================== button mode ====================
    if (mode === 'button') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are a CTA copywriter for Indian gifting banners.
Return ONLY valid JSON:
{"text":"Order Now","bgColor":"#E91E63","textColor":"#ffffff","explanation":"..."}`,
        messages: [{
          role: 'user',
          content: `Suggest a CTA button. ${styleInstruction}${contextBlock}
Max 4 words, action-oriented. Button color must stand out on the background.`,
        }],
      })

      const rawText = extractText(response)
      try {
        const parsed = parseAIResponse(rawText) as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: {
            text: parsed.text || 'Order Now',
            bgColor: parsed.bgColor || '#E91E63',
            textColor: parsed.textColor || '#ffffff',
            explanation: parsed.explanation || '',
          },
        })
      } catch {
        console.error('[style-text] button JSON parse failed:', rawText)
        return NextResponse.json(
          { success: false, error: 'AI returned invalid button response' },
          { status: 500 }
        )
      }
    }

    // ==================== shape_fill mode ====================
    if (mode === 'shape_fill') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are a banner design expert.
Suggest a CSS gradient or solid color for a shape/overlay layer.
Return ONLY valid JSON:
{"fill":"linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 100%)","explanation":"..."}`,
        messages: [{
          role: 'user',
          content: `Suggest overlay fill. ${styleInstruction}${contextBlock}
Must create sufficient contrast for white text on top.`,
        }],
      })

      const rawText = extractText(response)
      try {
        const parsed = parseAIResponse(rawText) as Record<string, unknown>
        return NextResponse.json({
          success: true,
          data: {
            fill: parsed.fill || 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 100%)',
            explanation: parsed.explanation || '',
          },
        })
      } catch {
        console.error('[style-text] shape_fill JSON parse failed:', rawText)
        return NextResponse.json(
          { success: false, error: 'AI returned invalid shape response' },
          { status: 500 }
        )
      }
    }

    // ==================== colors_only mode ====================
    if (mode === 'colors_only') {
      const colorSystemPrompt = `You are a UI color expert for an Indian gifting e-commerce banner system.
Suggest CTA button and badge colors that:
1. Harmonize with the existing color palette
2. Have sufficient contrast against the background (WCAG AA minimum)
3. Stand out enough to be effective CTAs
4. Fit the occasion/theme

Return ONLY valid JSON with these exact keys:
ctaBgColor, ctaTextColor, badgeBgColor, badgeTextColor, explanation.
Use hex colors for solid values, rgba() for transparency. No markdown, no fences.`

      const colorUserMessage = `Banner context:
Title: ${titleHtml || '(empty)'}
Subtitle: ${subtitleHtml || '(empty)'}
CTA Text: ${ctaText || '(empty)'}
Overlay Style: ${overlayStyle || 'dark-left'}
${contextBlock}

Instruction: ${styleInstruction}`

      const colorResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: colorSystemPrompt,
        messages: [{ role: 'user', content: colorUserMessage }],
      })

      const colorRawText = extractText(colorResponse)

      try {
        const colorParsed = parseAIResponse(colorRawText) as Record<string, string>
        return NextResponse.json({
          success: true,
          data: {
            ctaBgColor: colorParsed.ctaBgColor || '#E91E63',
            ctaTextColor: colorParsed.ctaTextColor || '#FFFFFF',
            badgeBgColor: colorParsed.badgeBgColor || 'rgba(255,255,255,0.2)',
            badgeTextColor: colorParsed.badgeTextColor || '#FFFFFF',
            explanation: colorParsed.explanation || '',
          },
        })
      } catch {
        console.error('[style-text] colors_only JSON parse failed:', colorRawText)
        return NextResponse.json(
          { success: false, error: 'AI returned invalid color response' },
          { status: 500 }
        )
      }
    }

    // ==================== Standard text styling mode ====================
    if (!titleHtml?.trim() && !subtitleHtml?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Provide at least one of titleHtml or subtitleHtml' },
        { status: 400 }
      )
    }

    // Build target-specific additions to system prompt
    let targetInstruction = ''
    if (target === 'title') {
      targetInstruction = '\nIMPORTANT: Style ONLY the titleHtml field. Return the subtitleHtml EXACTLY as provided, unchanged.'
    } else if (target === 'subtitle') {
      targetInstruction = '\nIMPORTANT: Style ONLY the subtitleHtml field. Return the titleHtml EXACTLY as provided, unchanged.'
    }

    const systemPrompt = `You are a banner text styling expert for an Indian gifting e-commerce platform (Gifts Cart India).
You receive HTML banner text and styling instructions, and return improved HTML with inline styles.

Rules:
- Use ONLY inline styles on <span>, <strong>, <em> tags — no external CSS classes
- Preserve the text content exactly — only change formatting/colors/emphasis
- HTML tags allowed: <strong>, <em>, <br/>, <span style="...">, <mark style="...">
- Keep it concise — banner text must be scannable in 2 seconds
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- suggestedColors should be the actual hex values you used
${targetInstruction}

Response format: {"titleHtml":"...","subtitleHtml":"...","explanation":"...","suggestedColors":["#hex1","#hex2"]}`

    const userMessage = `Style instruction: ${styleInstruction}

Current title HTML: ${titleHtml || '(empty)'}
Current subtitle HTML: ${subtitleHtml || '(empty)'}
${ctaText ? `CTA button text: ${ctaText}` : ''}
${backgroundImageUrl ? 'Background image: Yes (consider contrast)' : ''}
${overlayStyle ? `Overlay style: ${overlayStyle} (affects contrast needs)` : ''}
${currentColors?.length ? `Currently used colors: ${currentColors.join(', ')}` : ''}
${contextBlock}

Important:
- If background is dark, use light/white text colors
- If background is light, use dark text colors
- Match or complement the existing color palette
- Maintain font consistency with other layers if fonts are specified in context
- Return ONLY valid JSON, no markdown

Apply the styling instruction and return the JSON response.`

    // API call
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = extractText(response)

    let parsed: {
      titleHtml: string
      subtitleHtml: string
      explanation: string
      suggestedColors: string[]
    }
    try {
      parsed = parseAIResponse(rawText) as typeof parsed
    } catch {
      console.error('[style-text] JSON parse failed. Raw response:', rawText)
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid response format',
          rawPreview: rawText.slice(0, 300),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        titleHtml: parsed.titleHtml || titleHtml,
        subtitleHtml: parsed.subtitleHtml || subtitleHtml,
        explanation: parsed.explanation || '',
        suggestedColors: parsed.suggestedColors || [],
      },
    })
  } catch (err: unknown) {
    const error = err as Error & { status?: number }
    console.error('[style-text] FULL ERROR:', {
      message: error?.message,
      status: error?.status,
      type: error?.constructor?.name,
      stack: error?.stack?.split('\n').slice(0, 5),
    })
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Style generation failed',
      },
      { status: 500 }
    )
  }
}
