import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { updateAdminOrder } from "@/lib/checkout"

export const runtime = "nodejs"

const updateOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(190),
  customerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  internalLabel: z.string().trim().max(80).optional(),
  quantity: z.number().int().min(1).max(50).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { orderId } = await params
  const json = await request.json().catch(() => null)
  const parsed = updateOrderSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order update payload." }, { status: 400 })
  }

  try {
    const order = await updateAdminOrder({
      orderId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone || undefined,
      notes: parsed.data.notes || undefined,
      internalLabel: parsed.data.internalLabel || undefined,
      quantity: parsed.data.quantity,
    })

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        quantity: order.quantity,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update order."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
