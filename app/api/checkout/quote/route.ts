import { NextResponse } from "next/server"
import { z } from "zod"

import { formatCurrency, getCheckoutQuote, getCheckoutSetupIssue } from "@/lib/checkout"

export const runtime = "nodejs"

const checkoutQuoteSchema = z.object({
  eventId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
  ticketTierId: z.string().trim().min(1).optional(),
  voucherCode: z.string().trim().max(40).optional(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = checkoutQuoteSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pricing request." }, { status: 400 })
  }

  try {
    const quote = await getCheckoutQuote({
      eventId: parsed.data.eventId,
      quantity: parsed.data.quantity,
      ticketTierId: parsed.data.ticketTierId || undefined,
      voucherCode: parsed.data.voucherCode || undefined,
    })

    return NextResponse.json({
      ok: true,
      quote: {
        quantity: quote.quantity,
        unitPriceCents: quote.unitPriceCents,
        subtotalCents: quote.subtotalCents,
        discountAmountCents: quote.discountAmountCents,
        totalPriceCents: quote.totalPriceCents,
        currency: quote.currency,
        availableTickets: quote.availableTickets,
        maxTicketsPerOrder: quote.maxTicketsPerOrder,
        selectedTier: quote.selectedTier
          ? {
              id: quote.selectedTier.id,
              name: quote.selectedTier.name,
              description: quote.selectedTier.description,
            }
          : null,
        voucher: quote.voucher
          ? {
              code: quote.voucher.code,
              description: quote.voucher.description,
              discountLabel:
                quote.voucher.discountType === "FIXED"
                  ? formatCurrency(quote.voucher.amountOffCents || 0, quote.currency)
                  : `${quote.voucher.percentOff || 0}% off`,
            }
          : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate pricing."
    const setupIssue = getCheckoutSetupIssue(error)
    const status = /database|Prisma|Stripe secret key/i.test(setupIssue.title) ? 500 : 400

    return NextResponse.json({ error: status === 500 ? setupIssue.description : message }, { status })
  }
}
