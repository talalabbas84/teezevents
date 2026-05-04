import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { refundAdminOrder } from "@/lib/checkout"

export const runtime = "nodejs"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { orderId } = await params

  try {
    const order = await refundAdminOrder(orderId)

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refund order."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
