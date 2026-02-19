import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// ==================== POST — Bulk propagate all templates to linked products ====================

export async function POST(
  _request: NextRequest,
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

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        addonTemplates: {
          where: { isActive: true },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    let templatesProcessed = 0
    let groupsUpdated = 0

    // Sequential queries (no interactive transaction — pgbouncer compatible)
    for (const template of category.addonTemplates) {
      templatesProcessed++

      // Find all linked product addon groups that are not overridden
      const linkedGroups = await prisma.productAddonGroup.findMany({
        where: {
          templateGroupId: template.id,
          isOverridden: false,
        },
      })

      for (const group of linkedGroups) {
        // Update group fields to match template
        await prisma.productAddonGroup.update({
          where: { id: group.id },
          data: {
            name: template.name,
            description: template.description,
            type: template.type,
            required: template.required,
            maxLength: template.maxLength,
            placeholder: template.placeholder,
            acceptedFileTypes: template.acceptedFileTypes,
            maxFileSizeMb: template.maxFileSizeMb,
          },
        })

        // Replace options: delete existing, insert fresh from template
        await prisma.productAddonOption.deleteMany({
          where: { groupId: group.id },
        })
        for (const opt of template.options) {
          await prisma.productAddonOption.create({
            data: {
              groupId: group.id,
              label: opt.label,
              price: opt.price,
              image: opt.image,
              isDefault: opt.isDefault,
              sortOrder: opt.sortOrder,
            },
          })
        }

        groupsUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      data: { templatesProcessed, groupsUpdated },
    })
  } catch (error) {
    console.error('POST /api/admin/categories/[id]/sync-templates error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync templates' },
      { status: 500 }
    )
  }
}
