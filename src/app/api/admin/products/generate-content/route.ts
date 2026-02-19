import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const productName = formData.get('productName') as string
    const categoryName = formData.get('categoryName') as string
    const price = formData.get('price') as string
    const weight = formData.get('weight') as string | null
    const occasion = formData.get('occasion') as string | null
    const referenceImage = formData.get('referenceImage') as File | null

    if (!productName || !categoryName || !price) {
      return NextResponse.json({ success: false, error: 'productName, categoryName and price are required' }, { status: 400 })
    }

    let referenceImageBase64: string | null = null
    let referenceImageMimeType = 'image/jpeg'
    if (referenceImage && referenceImage.size > 0) {
      const buffer = Buffer.from(await referenceImage.arrayBuffer())
      referenceImageBase64 = buffer.toString('base64')
      referenceImageMimeType = referenceImage.type || 'image/jpeg'
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const claudePrompt = `You are writing product content for an Indian online gifting platform called Gifts Cart India.
Product: ${productName}
Category: ${categoryName}
Price: ₹${price}
Weight: ${weight || 'not specified'}
Occasions: ${occasion || 'general gifting'}

Return ONLY valid JSON, no markdown backticks:
{
  "description": "60-80 word product description. Warm, celebratory tone. Mention freshness and quality. End with a delivery promise.",
  "shortDesc": "15-20 word summary for product cards.",
  "metaTitle": "Page title max 60 chars. Include product name and key benefit.",
  "metaDescription": "Meta description max 155 chars. Include product name, features, soft CTA.",
  "metaKeywords": ["keyword1", "keyword2"],
  "tags": ["tag1", "tag2"],
  "imagePrompt": "Professional product photo description, 60-80 words. Studio lighting, white background, Indian celebration props. Photorealistic. No text or logos."
}`

    const messages: Anthropic.MessageParam[] = []
    if (referenceImageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: referenceImageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: referenceImageBase64 } },
          { type: 'text', text: claudePrompt },
        ],
      })
    } else {
      messages.push({ role: 'user', content: claudePrompt })
    }

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages,
    })

    const rawText = claudeResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('')

    const cleanJson = rawText.replace(/```json|```/g, '').trim()
    const generated = JSON.parse(cleanJson)

    return NextResponse.json({ success: true, data: generated })
  } catch (error) {
    console.error('generate-content error:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
