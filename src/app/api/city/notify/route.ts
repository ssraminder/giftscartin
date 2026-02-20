import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const notifySchema = z.object({
  email: z.email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  cityName: z.string().min(1).max(200),
}).refine((data) => data.email || data.phone, {
  message: 'Either email or phone is required',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = notifySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, phone, cityName } = parsed.data

    await prisma.cityNotification.create({
      data: {
        email: email || null,
        phone: phone || null,
        cityName,
      },
    })

    // Increment notify count on the city if it exists
    const city = await prisma.city.findFirst({
      where: {
        OR: [
          { name: { equals: cityName, mode: 'insensitive' } },
          { slug: { equals: cityName.toLowerCase().replace(/\s+/g, '-') } },
        ],
      },
    })
    if (city) {
      await prisma.city.update({
        where: { id: city.id },
        data: { notifyCount: { increment: 1 } },
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Notification registered successfully' },
    })
  } catch (error) {
    console.error('POST /api/city/notify error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register notification' },
      { status: 500 }
    )
  }
}
