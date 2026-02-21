import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        landmark: true,
        city: true,
        state: true,
        pincode: true,
        isDefault: true,
      },
    })

    return NextResponse.json({ success: true, data: addresses })
  } catch (error) {
    console.error("GET /api/addresses error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch addresses" },
      { status: 500 }
    )
  }
}
