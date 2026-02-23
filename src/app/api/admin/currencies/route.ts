import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
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

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data: currencies, error } = await supabase
      .from('currency_configs')
      .select('*')
      .order('isDefault', { ascending: false })
      .order('code', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (currencies || []).map((c) => ({
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

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = currencySchema.parse(body)
    const supabase = getSupabaseAdmin()

    if (data.isDefault) {
      await supabase.from('currency_configs').update({ isDefault: false }).eq('isDefault', true)
    }

    const { data: currency, error } = await supabase
      .from('currency_configs')
      .insert(data)
      .select()
      .single()

    if (error) throw error

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

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = updateSchema.parse(body)
    const supabase = getSupabaseAdmin()

    if (data.isDefault) {
      await supabase.from('currency_configs').update({ isDefault: false }).eq('isDefault', true).neq('id', id)
    }

    const { data: currency, error } = await supabase
      .from('currency_configs')
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

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

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: currency } = await supabase
      .from('currency_configs')
      .select('id, isDefault')
      .eq('id', id)
      .maybeSingle()

    if (!currency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 })
    }
    if (currency.isDefault) {
      return NextResponse.json({ success: false, error: 'Cannot delete the default currency' }, { status: 400 })
    }

    await supabase.from('currency_configs').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin currencies DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete currency' }, { status: 500 })
  }
}
