import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
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
        { success: false, error: 'Title and subtitle cannot both be empty' },
        { status: 400 }
      )
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `You are a banner text styling expert for an Indian gifting e-commerce platform (Gifts Cart India).
You receive HTML banner text and styling instructions, and return improved HTML with inline styles.

Rules:
- Use ONLY inline styles on <span>, <strong>, <em> tags — no external CSS classes
- Preserve the text content exactly — only change formatting/colors/emphasis
- HTML tags allowed: <strong>, <em>, <br/>, <span style="...">, <mark style="...">
- Keep it concise — banner text must be scannable in 2 seconds
- Return ONLY valid JSON, no markdown, no explanation outside JSON
- suggestedColors should be the actual hex values you used`

    const userMessage = `Style instruction: ${styleInstruction}

Current title HTML: ${titleHtml || '(empty)'}
Current subtitle HTML: ${subtitleHtml || '(empty)'}
CTA text context: ${ctaText || '(none)'}
Background image: ${backgroundImageUrl ? 'Yes (consider contrast)' : 'No image'}
Overlay style: ${overlayStyle || 'dark-left'}
Currently used colors: ${currentColors?.length ? currentColors.join(', ') : 'none'}

Return JSON with this exact shape:
{
  "titleHtml": "restyled title HTML",
  "subtitleHtml": "restyled subtitle HTML",
  "explanation": "brief explanation of what was changed",
  "suggestedColors": ["#hex1", "#hex2"]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse JSON from response — strip markdown code fences if present
    const text = textContent.text
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)

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
    console.error('[style-text] Error:', error?.message, error?.stack)
    const message = err instanceof SyntaxError
      ? 'AI returned invalid response format'
      : error?.message || 'Style generation failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
