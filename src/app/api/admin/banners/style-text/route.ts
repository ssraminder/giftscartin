import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
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

export async function POST(req: NextRequest) {
  try {
    // Auth — exact same pattern as generate-content route
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
    } = body as {
      titleHtml?: string
      subtitleHtml?: string
      ctaText?: string
      styleInstruction?: string
      backgroundImageUrl?: string
      overlayStyle?: string
      currentColors?: string[]
    }

    if (!styleInstruction?.trim()) {
      return NextResponse.json(
        { success: false, error: 'styleInstruction is required' },
        { status: 400 }
      )
    }

    if (!titleHtml?.trim() && !subtitleHtml?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Provide at least one of titleHtml or subtitleHtml' },
        { status: 400 }
      )
    }

    // Anthropic client — exact same pattern as generate-content route
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `You are a banner text styling expert for an Indian gifting e-commerce platform (Gifts Cart India).
You receive HTML banner text and styling instructions, and return improved HTML with inline styles.

Rules:
- Use ONLY inline styles on <span>, <strong>, <em> tags — no external CSS classes
- Preserve the text content exactly — only change formatting/colors/emphasis
- HTML tags allowed: <strong>, <em>, <br/>, <span style="...">, <mark style="...">
- Keep it concise — banner text must be scannable in 2 seconds
- Return ONLY valid JSON, no markdown, no code fences, no explanation
- suggestedColors should be the actual hex values you used

Response format: {"titleHtml":"...","subtitleHtml":"...","explanation":"...","suggestedColors":["#hex1","#hex2"]}`

    const userMessage = `Style instruction: ${styleInstruction}

Current title HTML: ${titleHtml || '(empty)'}
Current subtitle HTML: ${subtitleHtml || '(empty)'}
${ctaText ? `CTA button text: ${ctaText}` : ''}
${backgroundImageUrl ? 'Background image: Yes (consider contrast)' : ''}
${overlayStyle ? `Overlay style: ${overlayStyle} (affects contrast needs)` : ''}
${currentColors?.length ? `Currently used colors: ${currentColors.join(', ')}` : ''}

Apply the styling instruction and return the JSON response.`

    // API call — same pattern as generate-content
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Response parsing — same pattern as generate-content
    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('')

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: {
      titleHtml: string
      subtitleHtml: string
      explanation: string
      suggestedColors: string[]
    }
    try {
      parsed = JSON.parse(cleaned)
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
