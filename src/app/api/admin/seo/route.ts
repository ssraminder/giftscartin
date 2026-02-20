import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteDescription: z.string().optional(),
  defaultOgImage: z.string().url().nullable().optional(),
  googleVerification: z.string().nullable().optional(),
  robotsTxt: z.string().nullable().optional(),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || !isAdminRole((session.user as { role?: string }).role || '')) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const err = await requireAdmin()
  if (err) return err
  const settings = await prisma.seoSettings.findFirst()
  return NextResponse.json({ success: true, data: settings })
}

export async function PUT(req: Request) {
  const err = await requireAdmin()
  if (err) return err

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 })
  }

  const existing = await prisma.seoSettings.findFirst()
  const settings = existing
    ? await prisma.seoSettings.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.seoSettings.create({ data: parsed.data as z.infer<typeof updateSchema> })

  return NextResponse.json({ success: true, data: settings })
}
