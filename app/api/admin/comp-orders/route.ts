import { NextResponse } from "next/server"
import { z } from "zod"

import { getAdminSession, isAdminAuthenticated } from "@/lib/admin-auth"
import { createComplimentaryOrder } from "@/lib/checkout"
import { getTicketDeliverySetupIssue, sendTicketsForOrder } from "@/lib/ticket-delivery"

export const runtime = "nodejs"

const complimentaryOrderSchema = z.object({
  eventId: z.string().trim().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(190),
  customerPhone: z.string().trim().max(40).optional(),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
  internalLabel: z.string().trim().max(80).optional(),
  sendEmail: z.boolean().optional(),
})

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const adminSession = await getAdminSession()
  const json = await request.json().catch(() => null)
  const parsed = complimentaryOrderSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid complimentary ticket request." }, { status: 400 })
  }

  try {
    const order = await createComplimentaryOrder({
      ...parsed.data,
      customerPhone: parsed.data.customerPhone || undefined,
      notes: parsed.data.notes || undefined,
      internalLabel: parsed.data.internalLabel || undefined,
      issuedByAdminEmail: adminSession?.email || process.env.ADMIN_EMAIL || "admin",
    })

    let emailStatus: "not_requested" | "sent" | "skipped" | "unavailable" = "not_requested"
    let emailRecipient = order.customerEmail

    if (parsed.data.sendEmail) {
      const emailIssue = getTicketDeliverySetupIssue()

      if (emailIssue) {
        emailStatus = "unavailable"
      } else {
        const delivery = await sendTicketsForOrder({
          orderId: order.id,
          recipientEmail: order.customerEmail,
        })
        emailStatus = delivery.status
        emailRecipient = delivery.recipientEmail
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        accessToken: order.accessToken,
        customerEmail: order.customerEmail,
        quantity: order.quantity,
        internalLabel: order.internalLabel,
        source: order.source,
      },
      emailStatus,
      emailRecipient,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create complimentary tickets."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
