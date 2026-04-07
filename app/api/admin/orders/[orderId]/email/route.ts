import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { sendTicketsForOrder } from "@/lib/ticket-delivery"

export const runtime = "nodejs"

const emailSchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { orderId } = await params
  const json = await request.json().catch(() => null)
  const parsed = emailSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticket email request." }, { status: 400 })
  }

  try {
    const result = await sendTicketsForOrder({
      orderId,
      recipientEmail: parsed.data.recipientEmail,
    })

    return NextResponse.json({
      ok: true,
      status: result.status,
      recipientEmail: result.recipientEmail,
      orderNumber: result.order.orderNumber,
      ticketEmailSendCount: result.order.ticketEmailSendCount,
      ticketEmailLastSentAt: result.order.ticketEmailLastSentAt?.toISOString() || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to email tickets."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
