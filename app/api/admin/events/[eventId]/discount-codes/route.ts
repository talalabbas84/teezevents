import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { buildCsv } from "@/lib/csv"
import { getPrismaClient } from "@/lib/prisma"

export const runtime = "nodejs"

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

const discountCodeSchema = z.object({
  emails: z.string().trim().max(100000).optional(),
  useEventGuests: z.boolean().optional(),
  sourceEventId: z.string().trim().max(80).optional(),
  campaignName: z.string().trim().max(80).optional(),
  codePrefix: z.string().trim().max(16).optional(),
  discountType: z.enum(["FIXED", "PERCENT"]),
  amountValue: z.number().min(0).max(10000),
  expiresAt: z.string().trim().max(40).optional(),
})

function normalizeCodePrefix(value?: string) {
  const prefix = (value || "TEEZ")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16)

  return prefix || "TEEZ"
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function parseEmails(value: string) {
  const matches = value.match(emailPattern) || []
  return [...new Set(matches.map(normalizeEmail).filter((email) => email.length <= 190))]
}

async function getPaidGuestEmails(eventId: string) {
  const prisma = getPrismaClient()
  const [orders, tickets] = await Promise.all([
    prisma.ticketOrder.findMany({
      where: {
        eventId,
        status: "PAID",
      },
      select: {
        customerEmail: true,
      },
    }),
    prisma.ticket.findMany({
      where: {
        eventId,
        order: {
          status: "PAID",
        },
      },
      select: {
        holderEmail: true,
      },
    }),
  ])

  return [
    ...orders.map((order) => order.customerEmail),
    ...tickets.map((ticket) => ticket.holderEmail),
  ]
}

function buildCode(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12)

  return `${prefix}-${suffix}`.toUpperCase().slice(0, 40)
}

function buildCheckoutUrl(request: Request, eventId: string, code: string) {
  const origin = new URL(request.url).origin
  return `${origin}/checkout/${encodeURIComponent(eventId)}?voucher=${encodeURIComponent(code)}`
}

function buildAssignedDescription(campaignName: string, email: string) {
  const marker = `[assigned-email:${email}]`
  const maxCampaignLength = Math.max(0, 240 - marker.length - 1)
  const campaign = campaignName.slice(0, maxCampaignLength).trim()

  return campaign ? `${campaign} ${marker}` : marker
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const json = await request.json().catch(() => null)
  const parsed = discountCodeSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid discount-code request." }, { status: 400 })
  }

  const sourceEventId = parsed.data.sourceEventId || eventId
  const guestEmails = parsed.data.useEventGuests ? await getPaidGuestEmails(sourceEventId) : []
  const emails = [...new Set([...parseEmails(parsed.data.emails || ""), ...guestEmails.map(normalizeEmail)])]

  if (emails.length === 0) {
    return NextResponse.json({ error: "Paste at least one valid guest email or enable event guest email import." }, { status: 400 })
  }

  if (emails.length > 5000) {
    return NextResponse.json({ error: "Generate at most 5,000 codes at a time." }, { status: 400 })
  }

  if (parsed.data.discountType === "PERCENT" && (parsed.data.amountValue < 1 || parsed.data.amountValue > 100)) {
    return NextResponse.json({ error: "Percent discount must be between 1 and 100." }, { status: 400 })
  }

  if (parsed.data.discountType === "FIXED" && parsed.data.amountValue <= 0) {
    return NextResponse.json({ error: "Fixed discount must be above $0." }, { status: 400 })
  }

  const prefix = normalizeCodePrefix(parsed.data.codePrefix)
  const campaignName = parsed.data.campaignName?.trim() || "Guest discount"
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Expiry date is invalid." }, { status: 400 })
  }

  try {
    const prisma = getPrismaClient()
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        title: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Target event was not found." }, { status: 404 })
    }

    const rows: string[][] = []

    for (const email of emails) {
      let voucher = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = buildCode(prefix)

        try {
          voucher = await prisma.voucher.create({
            data: {
              eventId: event.id,
              code,
              description: buildAssignedDescription(campaignName, email),
              discountType: parsed.data.discountType,
              amountOffCents:
                parsed.data.discountType === "FIXED" ? Math.round(parsed.data.amountValue * 100) : null,
              percentOff: parsed.data.discountType === "PERCENT" ? Math.round(parsed.data.amountValue) : null,
              minimumQuantity: null,
              maxRedemptions: 1,
              startsAt: null,
              expiresAt,
              isActive: true,
            },
          })
          break
        } catch (error) {
          const message = error instanceof Error ? error.message : ""

          if (!/Unique constraint|unique/i.test(message) || attempt === 4) {
            throw error
          }
        }
      }

      if (!voucher) {
        throw new Error(`Unable to create voucher for ${email}.`)
      }

      rows.push([
        email,
        voucher.code,
        event.id,
        event.title,
        parsed.data.discountType,
        parsed.data.discountType === "FIXED"
          ? (Math.round(parsed.data.amountValue * 100) / 100).toFixed(2)
          : String(Math.round(parsed.data.amountValue)),
        "1",
        expiresAt?.toISOString() || "",
        buildCheckoutUrl(request, event.id, voucher.code),
      ])
    }

    const csv = buildCsv([
      [
        "email",
        "discount_code",
        "event_id",
        "event_title",
        "discount_type",
        "discount_value",
        "max_redemptions",
        "expires_at",
        "checkout_url",
      ],
      ...rows,
    ])

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.id}-guest-discount-codes.csv"`,
        "X-Generated-Code-Count": String(rows.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate discount codes."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
