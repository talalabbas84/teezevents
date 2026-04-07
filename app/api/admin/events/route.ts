import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { deleteAdminEvent, upsertAdminEvent } from "@/lib/admin-events"

export const runtime = "nodejs"

const ticketTierSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  priceCad: z.number().min(0).max(10000),
  quantityLimit: z.number().int().min(1).max(50000).optional(),
  maxPerOrder: z.number().int().min(1).max(50000).optional(),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  isHidden: z.boolean(),
})

const voucherSchema = z.object({
  id: z.string().trim().min(1).optional(),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(240).optional(),
  discountType: z.enum(["FIXED", "PERCENT"]),
  amountCadOff: z.number().min(0).max(10000).optional(),
  percentOff: z.number().int().min(1).max(100).optional(),
  minimumQuantity: z.number().int().min(1).max(50).optional(),
  maxRedemptions: z.number().int().min(1).max(100000).optional(),
  startsAt: z.string().trim().max(40).optional(),
  expiresAt: z.string().trim().max(40).optional(),
  isActive: z.boolean(),
})

const managedEventSchema = z.object({
  id: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(140),
  startsAt: z.string().trim().max(40).optional(),
  venue: z.string().trim().max(140).optional(),
  address: z.string().trim().max(180).optional(),
  hostedBy: z.string().trim().max(80).optional(),
  image: z.string().trim().max(500).optional(),
  previewDescription: z.string().trim().max(240).optional(),
  description: z.string().trim().max(5000).optional(),
  category: z.enum(["UPCOMING", "PAST"]),
  eventKind: z.enum(["THEMED", "SIGNATURE", "CORPORATE", "SOCIAL"]),
  ticketPriceCad: z.number().min(0).max(10000),
  capacity: z.number().int().min(1).max(50000),
  checkoutEnabled: z.boolean(),
  maxTicketsPerOrder: z.number().int().min(1).max(50000),
  ticketNote: z.string().trim().max(500).optional(),
  featured: z.boolean(),
  isActive: z.boolean(),
  ticketTiers: z.array(ticketTierSchema).default([]),
  vouchers: z.array(voucherSchema).default([]),
})

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = managedEventSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 })
  }

  try {
    const savedEvent = await upsertAdminEvent({
      ...parsed.data,
      startsAt: parsed.data.startsAt || undefined,
      venue: parsed.data.venue || undefined,
      address: parsed.data.address || undefined,
      hostedBy: parsed.data.hostedBy || undefined,
      image: parsed.data.image || undefined,
      previewDescription: parsed.data.previewDescription || undefined,
      description: parsed.data.description || undefined,
      ticketPriceCents: Math.round(parsed.data.ticketPriceCad * 100),
      ticketNote: parsed.data.ticketNote || undefined,
      ticketTiers: parsed.data.ticketTiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description || undefined,
        priceCents: Math.round(tier.priceCad * 100),
        quantityLimit: tier.quantityLimit,
        maxPerOrder: tier.maxPerOrder,
        sortOrder: tier.sortOrder,
        isActive: tier.isActive,
        isHidden: tier.isHidden,
      })),
      vouchers: parsed.data.vouchers.map((voucher) => ({
        id: voucher.id,
        code: voucher.code,
        description: voucher.description || undefined,
        discountType: voucher.discountType,
        amountOffCents:
          voucher.discountType === "FIXED" && typeof voucher.amountCadOff === "number"
            ? Math.round(voucher.amountCadOff * 100)
            : undefined,
        percentOff: voucher.discountType === "PERCENT" ? voucher.percentOff : undefined,
        minimumQuantity: voucher.minimumQuantity,
        maxRedemptions: voucher.maxRedemptions,
        startsAt: voucher.startsAt || undefined,
        expiresAt: voucher.expiresAt || undefined,
        isActive: voucher.isActive,
      })),
    })

    return NextResponse.json({
      ok: true,
      eventId: savedEvent.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save event."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const url = new URL(request.url)
  const eventId = url.searchParams.get("id")?.trim()

  if (!eventId) {
    return NextResponse.json({ error: "Event id is required." }, { status: 400 })
  }

  try {
    const result = await deleteAdminEvent(eventId)

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      eventId: result.mode === "deleted" ? result.eventId : result.event.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
