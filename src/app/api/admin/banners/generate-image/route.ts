import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { LayerContextSummary } from '@/lib/banner-layers'

interface GenerateImageRequest {
  imageType: 'background' | 'hero'
  prompt: string
  currentImageUrl?: string
  referenceImageBase64?: string
  bannerContext?: {
    titleHtml?: string
    occasion?: string
    citySlug?: string
  }
  layerContext?: LayerContextSummary
}

// POST — Create a job and trigger background function
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as GenerateImageRequest

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!body.imageType || !['background', 'hero'].includes(body.imageType)) {
      return NextResponse.json(
        { success: false, error: 'imageType must be "background" or "hero"' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Insert job row into banner_generation_jobs (reusing existing table)
    const { data: job, error: insertError } = await supabase
      .from('banner_generation_jobs')
      .insert({
        theme: `image:${body.imageType}:${body.prompt.trim().slice(0, 100)}`,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !job) {
      console.error('Failed to create image generation job:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create generation job' },
        { status: 500 }
      )
    }

    // Fire-and-forget — trigger the background function
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? 'https://giftscart.in'
    fetch(`${siteUrl}/.netlify/functions/banner-image-generate-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        imageType: body.imageType,
        prompt: body.prompt.trim(),
        referenceImageBase64: body.referenceImageBase64,
        bannerContext: body.bannerContext,
        layerContext: body.layerContext,
      }),
    }).catch((err) => {
      console.error('Failed to invoke image generation background function:', err)
    })

    return NextResponse.json({
      success: true,
      data: { jobId: job.id, status: 'pending' },
    })
  } catch (error) {
    console.error('POST /api/admin/banners/generate-image error:', error)
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// GET — Poll job status
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('banner_generation_jobs')
      .select('status, result, error')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    const result = data.result as Record<string, string> | null

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: data.status,
        imageUrl: data.status === 'done' ? result?.imageUrl : undefined,
        promptUsed: data.status === 'done' ? result?.promptUsed : undefined,
        storageKey: data.status === 'done' ? result?.storageKey : undefined,
        errorMessage: data.status === 'failed' ? data.error : undefined,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/banners/generate-image error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
