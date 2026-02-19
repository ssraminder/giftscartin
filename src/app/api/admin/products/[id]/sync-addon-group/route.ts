import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

const syncSchema = z.object({
  addonGroupId: z.string().min(1),
})

// ==================== POST — Re-sync one addon group to its template ====================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { addonGroupId } = parsed.data

    // Load the addon group and confirm it belongs to this product
    const group = await prisma.productAddonGroup.findUnique({
      where: { id: addonGroupId },
    })

    if (!group || group.productId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Addon group not found for this product' },
        { status: 404 }
      )
    }

    if (!group.templateGroupId) {
      return NextResponse.json(
        { success: false, error: 'Group is not linked to a template.' },
        { status: 400 }
      )
    }

    // Load the category addon template
    const template = await prisma.categoryAddonTemplate.findUnique({
      where: { id: group.templateGroupId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Linked template no longer exists' },
        { status: 404 }
      )
    }

    // Update the group and replace options in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.productAddonGroup.update({
        where: { id: addonGroupId },
        data: {
          name: template.name,
          description: template.description,
          type: template.type,
          required: template.required,
          maxLength: template.maxLength,
          placeholder: template.placeholder,
          acceptedFileTypes: template.acceptedFileTypes,
          maxFileSizeMb: template.maxFileSizeMb,
          isOverridden: false,
        },
      })

      // Delete existing options and insert fresh from template
      await tx.productAddonOption.deleteMany({
        where: { groupId: addonGroupId },
      })
      for (const opt of template.options) {
        await tx.productAddonOption.create({
          data: {
            groupId: addonGroupId,
            label: opt.label,
            price: opt.price,
            image: opt.image,
            isDefault: opt.isDefault,
            sortOrder: opt.sortOrder,
          },
        })
      }
    })

    // Return the updated group with options
    const updated = await prisma.productAddonGroup.findUnique({
      where: { id: addonGroupId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('POST /api/admin/products/[id]/sync-addon-group error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync addon group' },
      { status: 500 }
    )
  }
}
