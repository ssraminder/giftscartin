import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const formData = await request.formData()

    const productName = formData.get('productName') as string
    const categoryName = formData.get('categoryName') as string
    const price = formData.get('price') as string
    const weight = formData.get('weight') as string | null
    const occasion = formData.get('occasion') as string | null
    const regenerateImageOnly = formData.get('regenerateImageOnly') === 'true'
    const existingImagePrompt = formData.get('imagePrompt') as string | null

    if (!productName || !categoryName || !price) {
      return NextResponse.json(
        { success: false, error: 'productName, categoryName, and price are required' },
        { status: 400 }
      )
    }

    // Handle optional reference image
    let referenceImageBase64: string | null = null
    let referenceImageMimeType: string = 'image/jpeg'
    const referenceImage = formData.get('referenceImage') as File | null

    if (referenceImage && referenceImage.size > 0) {
      const arrayBuffer = await referenceImage.arrayBuffer()
      referenceImageBase64 = Buffer.from(arrayBuffer).toString('base64')
      referenceImageMimeType = referenceImage.type || 'image/jpeg'
    }

    let generated: {
      description: string
      shortDesc: string
      metaTitle: string
      metaDescription: string
      metaKeywords: string[]
      tags: string[]
      imagePrompt: string
    }

    // Step 1 & 2: Call Claude API for content generation (skip if regenerateImageOnly)
    if (regenerateImageOnly && existingImagePrompt) {
      generated = {
        description: '',
        shortDesc: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: [],
        tags: [],
        imagePrompt: existingImagePrompt,
      }
    } else {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'ANTHROPIC_API_KEY is not configured' },
          { status: 500 }
        )
      }

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const claudePrompt = `You are writing product content for an Indian online gifting platform.
Product: ${productName}
Category: ${categoryName}
Price: ₹${price}
Weight: ${weight || 'not specified'}
Occasions: ${occasion || 'general gifting'}

Write the following for this product. Return ONLY valid JSON, no markdown:
{
  "description": "60-80 word product description. Warm, celebratory tone. Mention freshness, quality. End with a delivery promise.",
  "shortDesc": "15-20 word summary for product cards.",
  "metaTitle": "Product page title, max 60 chars. Include product name + key benefit + brand.",
  "metaDescription": "Meta description, max 155 chars. Include product name, key features, city, and a soft CTA.",
  "metaKeywords": ["keyword1", "keyword2", ...],
  "tags": ["tag1", "tag2", ...],
  "imagePrompt": "Describe a professional product photograph for this item. 60-80 words. Studio lighting, white background, styled with celebration props. Photorealistic. No text or logos."
}`

      const messages: Anthropic.MessageParam[] = []

      if (referenceImageBase64) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: referenceImageMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: referenceImageBase64,
              },
            },
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
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

      // Strip any accidental markdown fences
      const cleanJson = rawText.replace(/```json|```/g, '').trim()
      generated = JSON.parse(cleanJson)
    }

    // Step 3: Call GPT-image-1.5 for image generation
    let generatedImageUrl: string | null = null

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured')
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const imagePrompt = `${generated.imagePrompt} Indian gifting platform product photo. Do not include any text, watermarks, or logos.`

      let imageResponse

      if (referenceImageBase64) {
        // Use images.edit when we have a reference photo
        const imageBuffer = Buffer.from(referenceImageBase64, 'base64')
        const imageFile = await OpenAI.toFile(imageBuffer, 'reference.jpg', {
          type: referenceImageMimeType,
        })

        imageResponse = await openai.images.edit({
          model: 'gpt-image-1',
          image: imageFile,
          prompt: imagePrompt,
          size: '1024x1024',
        })
      } else {
        imageResponse = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'medium',
          n: 1,
        })
      }

      // GPT-image-1 returns base64 data by default
      const imageData = imageResponse.data?.[0]
      if (!imageData) throw new Error('No image data returned')

      let imageBufferToUpload: Buffer

      if ('b64_json' in imageData && imageData.b64_json) {
        imageBufferToUpload = Buffer.from(imageData.b64_json, 'base64')
      } else if ('url' in imageData && imageData.url) {
        // Fallback: download from URL if returned
        const imageRes = await fetch(imageData.url)
        imageBufferToUpload = Buffer.from(await imageRes.arrayBuffer())
      } else {
        throw new Error('No image data or URL returned')
      }

      const timestamp = Date.now()
      const safeName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      const storagePath = `ai-generated/${timestamp}-${safeName}.png`

      // Use Supabase client for storage upload
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: uploadError } = await supabaseAdmin.storage
        .from('products')
        .upload(storagePath, imageBufferToUpload, { contentType: 'image/png', upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('products')
        .getPublicUrl(storagePath)

      generatedImageUrl = publicUrlData.publicUrl
    } catch (imgError) {
      console.error('Image generation failed (non-fatal):', imgError)
      // Continue — return content without image
    }

    return NextResponse.json({
      success: true,
      data: {
        description: generated.description,
        shortDesc: generated.shortDesc,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        metaKeywords: generated.metaKeywords,
        tags: generated.tags,
        imagePrompt: generated.imagePrompt,
        imageUrl: generatedImageUrl,
      },
    })
  } catch (error) {
    console.error('Generate content error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate content'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
