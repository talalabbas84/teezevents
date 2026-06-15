import "server-only"

import { unstable_noStore as noStore } from "next/cache"

import {
  type EventData,
  type EventSection,
  type EventType,
} from "@/lib/events"
import { getPrismaClient } from "@/lib/prisma"

type DbEventRecord = {
  id: string
  title: string
  startsAt: Date | null
  venue: string | null
  address: string | null
  hostedBy: string | null
  image: string | null
  gallery?: unknown
  previewDescription: string | null
  description: string | null
  contentSections?: unknown
  category: "UPCOMING" | "PAST"
  eventKind: "THEMED" | "SIGNATURE" | "CORPORATE" | "SOCIAL"
  currency: string
  ticketPriceCents: number
  capacity: number
  checkoutEnabled: boolean
  maxTicketsPerOrder: number
  ticketNote: string | null
  featured: boolean
  isActive: boolean
  createdAt?: Date
}

type InventoryMap = Map<string, number>

function formatLongDate(date: Date | null) {
  if (!date) {
    return "Date to be announced"
  }

  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  })
}

function formatShortDate(date: Date | null) {
  if (!date) {
    return "Date TBA"
  }

  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  })
}

function formatTime(date: Date | null) {
  if (!date) {
    return undefined
  }

  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  })
}

function formatPrice(ticketPriceCents: number, currency = "cad") {
  if (ticketPriceCents <= 0) {
    return "Free"
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(ticketPriceCents / 100)
}

function mapCategory(category: DbEventRecord["category"]): EventData["category"] {
  return category === "PAST" ? "Past Event" : "Upcoming Event"
}

function mapEventType(eventKind: DbEventRecord["eventKind"]): EventType {
  switch (eventKind) {
    case "THEMED":
      return "themed"
    case "SIGNATURE":
      return "signature"
    case "CORPORATE":
      return "corporate"
    default:
      return "social"
  }
}

function buildFallbackHighlights(dbEvent: DbEventRecord) {
  const highlights = [
    dbEvent.venue ? `Hosted at ${dbEvent.venue}` : null,
    dbEvent.ticketPriceCents > 0 ? `${formatPrice(dbEvent.ticketPriceCents, dbEvent.currency)} ticketed entry` : "Complimentary entry",
    "Limited guest capacity",
    dbEvent.checkoutEnabled ? "Secure Stripe checkout enabled" : "Manual RSVP or admin-issued tickets only",
  ]

  return highlights.filter(Boolean) as string[]
}

function parseGallery(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 24)
}

function parseSections(value: unknown): EventSection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const section = item as { title?: unknown; body?: unknown }
      const title = typeof section.title === "string" ? section.title.trim() : ""
      const body = Array.isArray(section.body)
        ? section.body.filter((paragraph): paragraph is string => typeof paragraph === "string" && paragraph.trim().length > 0)
        : []

      return title && body.length > 0 ? { title, body } : null
    })
    .filter((section): section is EventSection => Boolean(section))
    .slice(0, 12)
}

function mapDbEventRecord(
  dbEvent: DbEventRecord,
  spotsLeft?: number,
  options: { includeInactive?: boolean } = {},
): EventData | null {
  if (!dbEvent.isActive && !options.includeInactive) {
    return null
  }

  const location = dbEvent.address ?? dbEvent.venue ?? "Toronto"
  const venue = dbEvent.venue ?? undefined
  const startsAt = dbEvent.startsAt
  const capacity = dbEvent.capacity || 0
  const ticketPriceCents = dbEvent.ticketPriceCents ?? 0
  const currency = (dbEvent.currency || "cad").toLowerCase()
  const dbGallery = parseGallery(dbEvent.gallery)
  const dbSections = parseSections(dbEvent.contentSections)

  return {
    id: dbEvent.id,
    title: dbEvent.title || "Untitled Event",
    date: formatLongDate(startsAt),
    shortDate: formatShortDate(startsAt),
    startsAtIso: startsAt?.toISOString(),
    time: formatTime(startsAt),
    venue,
    location,
    address: dbEvent.address ?? location,
    hostedBy: dbEvent.hostedBy || undefined,
    attendees: `${capacity}`,
    image: dbEvent.image || "/placeholder.svg",
    previewDescription:
      dbEvent.previewDescription ||
      "A live TEEZ event with digital tickets, admin check-in, and real-time capacity tracking.",
    description:
      dbEvent.description ||
      "Event details will be published here soon. Tickets and capacity are already managed live in the TEEZ dashboard.",
    category: mapCategory(dbEvent.category),
    type: mapEventType(dbEvent.eventKind),
    highlights: buildFallbackHighlights(dbEvent),
    gallery: dbGallery.length ? dbGallery : [dbEvent.image || "/placeholder.svg"],
    videoUrl: null,
    ticketsUrl: `/contact?event=${dbEvent.id}&intent=rsvp`,
    ticketPrice: formatPrice(ticketPriceCents, currency),
    ticketPriceCents,
    currency,
    maxTicketsPerOrder: Math.max(1, Math.min(dbEvent.maxTicketsPerOrder || capacity, capacity)),
    checkoutEnabled: dbEvent.checkoutEnabled,
    ticketNote:
      dbEvent.ticketNote ||
      "Checkout and inventory are managed live. Ticket holds expire automatically if payment is not completed.",
    spotsLeft: spotsLeft ?? capacity,
    capacity,
    sections: dbSections,
    featured: dbEvent.featured,
  }
}

async function getInventoryMap(eventIds: string[]) {
  if (!eventIds.length) {
    return new Map<string, number>() as InventoryMap
  }

  const prisma = getPrismaClient()
  const now = new Date()
  const reservations = await prisma.ticketOrder.findMany({
    where: {
      eventId: {
        in: eventIds,
      },
      OR: [
        {
          status: "PAID",
        },
        {
          status: "PENDING",
          expiresAt: {
            gt: now,
          },
        },
      ],
    },
    select: {
      eventId: true,
      quantity: true,
    },
  })

  const totals = new Map<string, number>()

  reservations.forEach((reservation) => {
    totals.set(reservation.eventId, (totals.get(reservation.eventId) || 0) + reservation.quantity)
  })

  return totals
}

function sortEvents(events: EventData[]) {
  return [...events].sort((left, right) => {
    const leftUpcoming = left.category === "Upcoming Event" ? 0 : 1
    const rightUpcoming = right.category === "Upcoming Event" ? 0 : 1

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming - rightUpcoming
    }

    const leftTime = left.startsAtIso ? new Date(left.startsAtIso).getTime() : 0
    const rightTime = right.startsAtIso ? new Date(right.startsAtIso).getTime() : 0

    if (left.category === "Past Event" && right.category === "Past Event") {
      return rightTime - leftTime
    }

    return leftTime - rightTime
  })
}

export async function listPublicEvents() {
  noStore()

  try {
    const prisma = getPrismaClient()
    const dbEvents = (await prisma.event.findMany({
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    })) as DbEventRecord[]
    const dbEventIds = dbEvents.filter((event) => event.isActive).map((event) => event.id)
    const inventoryMap = await getInventoryMap(dbEventIds)
    const publicEvents: EventData[] = []

    dbEvents.forEach((dbEvent) => {
      if (!dbEvent.isActive) {
        return
      }

      const reserved = inventoryMap.get(dbEvent.id) || 0
      const publicEvent = mapDbEventRecord(dbEvent, Math.max(dbEvent.capacity - reserved, 0))

      if (publicEvent) {
        publicEvents.push(publicEvent)
      }
    })

    return sortEvents(publicEvents)
  } catch {
    return []
  }
}

export async function getFeaturedPublicEvents() {
  const events = await listPublicEvents()
  return events.filter((event) => event.category === "Upcoming Event" && event.featured)
}

export async function getPublicEventById(eventId: string) {
  noStore()

  try {
    const prisma = getPrismaClient()
    const dbEvent = (await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    })) as DbEventRecord | null

    if (!dbEvent) {
      return null
    }

    if (!dbEvent.isActive) {
      return null
    }

    const inventoryMap = await getInventoryMap([eventId])
    const reserved = inventoryMap.get(eventId) || 0
    return mapDbEventRecord(dbEvent, Math.max(dbEvent.capacity - reserved, 0))
  } catch {
    return null
  }
}

export async function getCheckoutEventById(eventId: string) {
  noStore()

  try {
    const prisma = getPrismaClient()
    const dbEvent = (await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    })) as DbEventRecord | null

    if (!dbEvent) {
      return null
    }

    const inventoryMap = await getInventoryMap([eventId])
    const reserved = inventoryMap.get(eventId) || 0
    return mapDbEventRecord(dbEvent, Math.max(dbEvent.capacity - reserved, 0), {
      includeInactive: true,
    })
  } catch {
    return null
  }
}
