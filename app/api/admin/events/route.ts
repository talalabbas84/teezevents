import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { deleteAdminEvent, upsertAdminEvent } from "@/lib/admin-events"
import { eventDateTimeToDate, isValidEventDateTime } from "@/lib/event-time"
import { EVENT_PREVIEW_DESCRIPTION_MAX_LENGTH } from "@/lib/event-validation"
import { publishRealtimeEvent } from "@/lib/realtime"

export const runtime = "nodejs"

const optionalEventDateTimeSchema = z
  .string()
  .trim()
  .max(40)
  .refine(isValidEventDateTime, "Enter a valid date and time.")
  .optional()

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
  startsAt: optionalEventDateTimeSchema,
  expiresAt: optionalEventDateTimeSchema,
  isActive: z.boolean(),
})

const contentSectionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.array(z.string().trim().min(1).max(1200)).min(1).max(8),
})

const managedEventSchema = z.object({
  id: z
    .string({ required_error: "Event ID is required." })
    .trim()
    .min(2, "Event ID must be at least 2 characters.")
    .max(80, "Event ID must be 80 characters or fewer."),
  title: z
    .string({ required_error: "Title is required." })
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(140, "Title must be 140 characters or fewer."),
  startsAt: optionalEventDateTimeSchema,
  venue: z.string().trim().max(140).optional(),
  address: z.string().trim().max(180).optional(),
  hostedBy: z.string().trim().max(80).optional(),
  image: z.string().trim().max(500).optional(),
  gallery: z.array(z.string().trim().max(500)).max(24).default([]),
  previewDescription: z
    .string()
    .trim()
    .max(
      EVENT_PREVIEW_DESCRIPTION_MAX_LENGTH,
      `Preview description must be ${EVENT_PREVIEW_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters or fewer.`,
    )
    .optional(),
  description: z.string().trim().max(5000).optional(),
  contentSections: z.array(contentSectionSchema).max(12).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
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

function getFieldErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string[]>>((fieldErrors, issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : "event"
    fieldErrors[field] = [...(fieldErrors[field] || []), issue.message]
    return fieldErrors
  }, {})
}

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = managedEventSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some event details need attention.",
        fieldErrors: getFieldErrors(parsed.error),
      },
      { status: 400 },
    )
  }

  try {
    const savedEvent = await upsertAdminEvent({
      ...parsed.data,
      startsAt: parsed.data.startsAt ? eventDateTimeToDate(parsed.data.startsAt).toISOString() : undefined,
      venue: parsed.data.venue || undefined,
      address: parsed.data.address || undefined,
      hostedBy: parsed.data.hostedBy || undefined,
      image: parsed.data.image || undefined,
      gallery: parsed.data.gallery.filter(Boolean),
      previewDescription: parsed.data.previewDescription || undefined,
      description: parsed.data.description || undefined,
      contentSections: parsed.data.contentSections,
      tags: parsed.data.tags,
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
        startsAt: voucher.startsAt ? eventDateTimeToDate(voucher.startsAt).toISOString() : undefined,
        expiresAt: voucher.expiresAt ? eventDateTimeToDate(voucher.expiresAt).toISOString() : undefined,
        isActive: voucher.isActive,
      })),
    })

    publishRealtimeEvent({
      type: "planning:update",
      eventId: savedEvent.id,
      action: "EVENT_UPDATED",
      entityType: "Event",
      entityId: savedEvent.id,
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
    const resolvedEventId = result.mode === "deleted" ? result.eventId : result.event.id

    publishRealtimeEvent({
      type: "planning:update",
      eventId: resolvedEventId,
      action: result.mode === "deleted" ? "EVENT_DELETED" : "EVENT_ARCHIVED",
      entityType: "Event",
      entityId: resolvedEventId,
    })

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      eventId: resolvedEventId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
