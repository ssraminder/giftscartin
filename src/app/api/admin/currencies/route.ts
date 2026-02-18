import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const currencySchema = z.object({
  code: z.string().min(2).max(5).transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  symbolPosition: z.enum(['before', 'after']).default('before'),
  exchangeRate: z.number().positive(),
  markup: z.number().min(0).max(100).default(0),
  rounding: z.enum(['nearest', 'up', 'down', 'none']).default('nearest'),
  roundTo: z.number().positive().default(0.01),
  locale: z.string().min(2).max(10).default('en-US'),
  countries: z.array(z.string().length(2).transform((v) => v.toUpperCase())),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const updateSchema = currencySchema.partial().extend({
  id: z.string().min(1),
})

/**
 * GET /api/admin/currencies
 * List all currency configs.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as { role?: string }).role || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const currencies = await prisma.currencyConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: currencies.map((c) => ({
        ...c,
        exchangeRate: Number(c.exchangeRate),
        markup: Number(c.markup),
        roundTo: Number(c.roundTo),
      })),
    })
  } catch (error) {
    console.error('Admin currencies GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch currencies' }, { status: 500 })
  }
}

/**
 * POST /api/admin/currencies
 * Create a new currency config.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as { role?: string }).role || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = currencySchema.parse(body)

    // If setting as default, unset existing default
    if (data.isDefault) {
      await prisma.currencyConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const currency = await prisma.currencyConfig.create({ data })

    return NextResponse.json({
      success: true,
      data: {
        ...currency,
        exchangeRate: Number(currency.exchangeRate),
        markup: Number(currency.markup),
        roundTo: Number(currency.roundTo),
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const issue = (error as { issues: Array<{ path?: (string | number)[]; message: string }> }).issues[0]
      const field = issue.path?.length ? issue.path.join('.') : 'input'
      return NextResponse.json({ success: false, error: `${field}: ${issue.message}` }, { status: 400 })
    }
    console.error('Admin currencies POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create currency' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/currencies
 * Update an existing currency config.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as { role?: string }).role || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = updateSchema.parse(body)

    // If setting as default, unset existing default
    if (data.isDefault) {
      await prisma.currencyConfig.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const currency = await prisma.currencyConfig.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...currency,
        exchangeRate: Number(currency.exchangeRate),
        markup: Number(currency.markup),
        roundTo: Number(currency.roundTo),
      },
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const issue = (error as { issues: Array<{ path?: (string | number)[]; message: string }> }).issues[0]
      const field = issue.path?.length ? issue.path.join('.') : 'input'
      return NextResponse.json({ success: false, error: `${field}: ${issue.message}` }, { status: 400 })
    }
    console.error('Admin currencies PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update currency' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/currencies
 * Delete a currency config (cannot delete default).
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as { role?: string }).role || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 })
    }

    // Prevent deleting the default currency
    const currency = await prisma.currencyConfig.findUnique({ where: { id } })
    if (!currency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 })
    }
    if (currency.isDefault) {
      return NextResponse.json({ success: false, error: 'Cannot delete the default currency' }, { status: 400 })
    }

    await prisma.currencyConfig.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin currencies DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete currency' }, { status: 500 })
  }
}
