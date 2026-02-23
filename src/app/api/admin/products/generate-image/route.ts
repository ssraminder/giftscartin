import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { imagePrompt } = body

    if (!imagePrompt) {
      return NextResponse.json({ success: false, error: 'imagePrompt required' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `${imagePrompt} Indian gifting platform product photo. No text, watermarks, or logos.`,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    })

    const imageData = imageResponse.data?.[0]
    if (!imageData?.b64_json) throw new Error('No image data returned')

    // Return base64 data URL — no Supabase upload here (too slow for serverless)
    // Upload happens when product is saved
    return NextResponse.json({
      success: true,
      data: { dataUrl: `data:image/png;base64,${imageData.b64_json}` }
    })
  } catch (error) {
    console.error('generate-image error:', error)
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
