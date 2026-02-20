import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

async function getAdminUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = session.user as { id: string; role: string }
  if (!isAdminRole(user.role)) return null
  return user
}

// GET: List all payment methods
export async function GET() {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const methods = await prisma.paymentMethod.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('GET /api/admin/payment-methods error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// POST: Create a new payment method
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, slug, description, isActive, sortOrder } = body

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existing = await prisma.paymentMethod.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A payment method with this slug already exists' },
        { status: 400 }
      )
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        slug,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
      },
    })

    return NextResponse.json({ success: true, data: method })
  } catch (error) {
    console.error('POST /api/admin/payment-methods error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment method' },
      { status: 500 }
    )
  }
}
