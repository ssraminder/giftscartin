import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body?.brief?.trim()) {
      return NextResponse.json(
        { success: false, error: 'brief is required' },
        { status: 400 }
      )
    }

    const { brief, citySlug } = body as { brief: string; citySlug?: string }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `You are a banner designer for Gifts Cart India, an Indian gifting platform.
Design a complete banner layer stack based on the user's brief.

Layer type definitions (JSON):

BackgroundLayer: {
  id: string, type: "background", name: "Background",
  visible: true, locked: false,
  x: 0, y: 0, w: 100, h: 100,
  rotation: 0, opacity: 100, zIndex: 0,
  imageUrl: "", color: "#f3f4f6", gradient: "",
  objectFit: "cover", objectPosition: "center center"
}

ImageLayer: {
  id: string, type: "image", name: string,
  visible: true, locked: false,
  x: number, y: number, w: number, h: number,
  rotation: 0, opacity: 100, zIndex: 20,
  imageUrl: "",
  objectFit: "contain", objectPosition: "bottom center",
  borderRadius: 0, dropShadow: false
}

TextLayer: {
  id: string, type: "text", name: string,
  visible: true, locked: false,
  x: number, y: number, w: number, h: number,
  rotation: 0, opacity: 100, zIndex: 30,
  html: "styled html with inline styles and <strong>/<span> tags",
  fontFamily: "Poppins", fontSize: number, fontWeight: number,
  lineHeight: 1.2, letterSpacing: 0,
  textAlign: "left", verticalAlign: "center"
}

ShapeLayer: {
  id: string, type: "shape", name: string,
  visible: true, locked: false,
  x: number, y: number, w: number, h: number,
  rotation: 0, opacity: 100, zIndex: 10,
  shape: "gradient-overlay",
  fill: "CSS gradient string",
  borderRadius: 0, borderWidth: 0, borderColor: "transparent"
}

BadgeLayer: {
  id: string, type: "badge", name: string,
  visible: true, locked: false,
  x: number, y: number, w: number, h: number,
  rotation: 0, opacity: 100, zIndex: 40,
  text: string, icon: "emoji",
  fontFamily: "Poppins", fontSize: 13, fontWeight: 600,
  bgColor: "rgba(255,255,255,0.2)", textColor: "#ffffff",
  borderRadius: 999, paddingX: 12, paddingY: 4,
  borderWidth: 0, borderColor: "transparent"
}

ButtonLayer: {
  id: string, type: "button", name: string,
  visible: true, locked: false,
  x: number, y: number, w: number, h: number,
  rotation: 0, opacity: 100, zIndex: 40,
  text: string, href: "/category/...",
  fontFamily: "Poppins", fontSize: 15, fontWeight: 600,
  bgColor: "#E91E63", textColor: "#ffffff",
  borderRadius: 999, paddingX: 24, paddingY: 10,
  borderWidth: 0, borderColor: "transparent"
}

Rules:
- Always include exactly 1 background layer (zIndex: 0)
- Include 1 shape layer for a gradient overlay (zIndex: 10)
- Include 1 image layer for hero product (zIndex: 20)
- Include 1-2 text layers for headline + subtitle (zIndex: 30)
- Include 1 badge layer for urgency/offer (zIndex: 40)
- Include 1 button layer for CTA (zIndex: 40)
- Use Poppins as default font
- Title text should have inline styles with color using <span style="color:...">
- Text colors must contrast with background (dark bg = light text)
- Badge and button should use brand pink (#E91E63) or occasion-appropriate color
- All x/y/w/h values are percentages (0-100)
- Generate unique IDs (8+ char random strings)
- Return ONLY valid JSON: {"layers": [...], "explanation": "..."}`

    const userMessage = `Design a banner for: ${brief}${citySlug ? `\nCity: ${citySlug}, India` : ''}

Create the complete layer stack with appropriate styling, colors, and text for this Indian gifting platform.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('')

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned) as {
        layers: unknown[]
        explanation: string
      }

      if (!Array.isArray(parsed.layers) || parsed.layers.length === 0) {
        return NextResponse.json(
          { success: false, error: 'AI returned empty layers array' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          layers: parsed.layers,
          explanation: parsed.explanation || '',
        },
      })
    } catch {
      console.error('[auto-compose] JSON parse failed:', rawText.slice(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI returned invalid response format' },
        { status: 500 }
      )
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error('[auto-compose] error:', error?.message)
    return NextResponse.json(
      { success: false, error: error?.message || 'Auto-compose failed' },
      { status: 500 }
    )
  }
}
