import { NextResponse } from "next/server"
import { z } from "zod"
import { createStripeCheckoutForOrder, getCheckoutEvent, getCheckoutSetupIssue } from "@/lib/checkout"

export const runtime = "nodejs"

const checkoutSchema = z.object({
  eventId: z.string().trim().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(190),
  customerPhone: z.string().trim().max(40).optional(),
  quantity: z.number().int().min(1).max(10),
  notes: z.string().trim().max(500).optional(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 })
  }

  const event = getCheckoutEvent(parsed.data.eventId)

  if (!event) {
    return NextResponse.json({ error: "This event is not available for checkout." }, { status: 404 })
  }

  if (event.maxTicketsPerOrder && parsed.data.quantity > event.maxTicketsPerOrder) {
    return NextResponse.json(
      { error: `You can buy up to ${event.maxTicketsPerOrder} ticket(s) per order.` },
      { status: 400 },
    )
  }

  const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL

  if (!baseUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL configuration." }, { status: 500 })
  }

  try {
    const result = await createStripeCheckoutForOrder({
      ...parsed.data,
      customerPhone: parsed.data.customerPhone || undefined,
      notes: parsed.data.notes || undefined,
      baseUrl,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout."
    const setupIssue = getCheckoutSetupIssue(error)
    const status = /Missing STRIPE_SECRET_KEY|Missing NEXT_PUBLIC_APP_URL|Prisma client is not installed|does not exist in the current database|The table `public\./i.test(
      message,
    )
      ? 500
      : /sold out|remain|not available/i.test(message)
        ? 400
        : 500

    return NextResponse.json({ error: status === 500 ? setupIssue.description : message }, { status })
  }
}
