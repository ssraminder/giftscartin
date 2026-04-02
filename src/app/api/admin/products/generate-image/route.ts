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

    const systemPrompt = [
      'You are a professional product photographer for Gifts Cart India, an Indian online gifting platform.',
      'ALWAYS follow these rules when generating product images:',
      '1. Image must be a clean, professional product photo on a plain white or soft gradient background.',
      '2. Product must be centered and fill 70-80% of the frame — no excessive empty space.',
      '3. Use soft studio lighting with gentle shadows for depth — no harsh shadows or flat lighting.',
      '4. Style: photorealistic, high-end e-commerce product photography (like Amazon/Flipkart listings).',
      '5. NEVER include any text, watermarks, logos, brand names, price tags, or labels.',
      '6. NEVER include human hands, fingers, faces, or any body parts.',
      '7. NEVER include props that overshadow the main product.',
      '8. For food items (cakes, chocolates, sweets): show fresh, appetizing presentation with clean plating.',
      '9. For flowers: show vibrant, fresh arrangements with natural colors.',
      '10. For gift items: show clean packaging, ribbon details, festive but not cluttered.',
      '11. Output must be square (1:1 aspect ratio), suitable for 1024x1024px display.',
      '12. Colors must be true-to-life — do not over-saturate or add artificial color casts.',
    ].join('\n')

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `${systemPrompt}\n\nProduct to photograph: ${imagePrompt}`,
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
