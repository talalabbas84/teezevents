import "server-only"

import { unstable_noStore as noStore } from "next/cache"

import { allEvents, eventsById, type EventData, type EventType } from "@/lib/events"
import { getPrismaClient } from "@/lib/prisma"

type DbEventRecord = {
  id: string
  title: string
  startsAt: Date | null
  venue: string | null
  address: string | null
  hostedBy: string | null
  image: string | null
  previewDescription: string | null
  description: string | null
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
    `${dbEvent.capacity} total spots available`,
    dbEvent.checkoutEnabled ? "Secure Stripe checkout enabled" : "Manual RSVP or admin-issued tickets only",
  ]

  return highlights.filter(Boolean) as string[]
}

function mergeEventRecord(
  catalogEvent: EventData | null,
  dbEvent: DbEventRecord | null,
  spotsLeft?: number,
): EventData | null {
  if (!catalogEvent && !dbEvent) {
    return null
  }

  if (dbEvent && !dbEvent.isActive) {
    return null
  }

  if (!dbEvent && catalogEvent) {
    return {
      ...catalogEvent,
      spotsLeft: spotsLeft ?? catalogEvent.spotsLeft,
    }
  }

  if (!dbEvent) {
    return catalogEvent
  }

  const base = catalogEvent
  const location = dbEvent.address || base?.location || "Toronto"
  const startsAt = dbEvent.startsAt
  const capacity = dbEvent.capacity || base?.capacity || 0
  const ticketPriceCents = dbEvent.ticketPriceCents ?? base?.ticketPriceCents ?? 0
  const currency = (dbEvent.currency || base?.currency || "cad").toLowerCase()

  return {
    id: dbEvent.id,
    title: dbEvent.title || base?.title || "Untitled Event",
    date: formatLongDate(startsAt),
    shortDate: formatShortDate(startsAt),
    startsAtIso: startsAt?.toISOString() || base?.startsAtIso,
    time: formatTime(startsAt) || base?.time,
    venue: dbEvent.venue || base?.venue,
    location,
    address: dbEvent.address || base?.address || location,
    hostedBy: dbEvent.hostedBy || base?.hostedBy,
    attendees: base?.attendees || `${capacity}`,
    image: dbEvent.image || base?.image || "/placeholder.svg",
    previewDescription:
      dbEvent.previewDescription ||
      base?.previewDescription ||
      "A live TEEZ event with digital tickets, admin check-in, and real-time capacity tracking.",
    description:
      dbEvent.description ||
      base?.description ||
      "Event details will be published here soon. Tickets and capacity are already managed live in the TEEZ dashboard.",
    category: mapCategory(dbEvent.category),
    type: mapEventType(dbEvent.eventKind),
    highlights: base?.highlights?.length ? base.highlights : buildFallbackHighlights(dbEvent),
    gallery: base?.gallery?.length ? base.gallery : [dbEvent.image || "/placeholder.svg"],
    videoUrl: base?.videoUrl || null,
    ticketsUrl: base?.ticketsUrl || `/contact?event=${dbEvent.id}&intent=rsvp`,
    ticketPrice: formatPrice(ticketPriceCents, currency),
    ticketPriceCents,
    currency,
    maxTicketsPerOrder: Math.max(1, Math.min(dbEvent.maxTicketsPerOrder || base?.maxTicketsPerOrder || capacity, capacity)),
    checkoutEnabled: dbEvent.checkoutEnabled,
    ticketNote:
      dbEvent.ticketNote ||
      base?.ticketNote ||
      "Checkout and inventory are managed live. Ticket holds expire automatically if payment is not completed.",
    spotsLeft: spotsLeft ?? base?.spotsLeft ?? capacity,
    capacity,
    sections: base?.sections,
    guestStats: base?.guestStats,
    kindNote: base?.kindNote,
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
    const dbEventsById = new Map(dbEvents.map((event) => [event.id, event]))
    const merged: EventData[] = []
    const seen = new Set<string>()

    allEvents.forEach((catalogEvent) => {
      const dbEvent = dbEventsById.get(catalogEvent.id) || null
      const reserved = dbEvent ? inventoryMap.get(catalogEvent.id) || 0 : 0
      const capacity = dbEvent?.capacity ?? catalogEvent.capacity
      const available = typeof capacity === "number" ? Math.max(capacity - reserved, 0) : catalogEvent.spotsLeft
      const mergedEvent = mergeEventRecord(catalogEvent, dbEvent, available)

      if (mergedEvent) {
        merged.push(mergedEvent)
      }

      seen.add(catalogEvent.id)
    })

    dbEvents.forEach((dbEvent) => {
      if (seen.has(dbEvent.id) || !dbEvent.isActive) {
        return
      }

      const reserved = inventoryMap.get(dbEvent.id) || 0
      const mergedEvent = mergeEventRecord(null, dbEvent, Math.max(dbEvent.capacity - reserved, 0))

      if (mergedEvent) {
        merged.push(mergedEvent)
      }
    })

    return sortEvents(merged)
  } catch {
    return sortEvents(allEvents)
  }
}

export async function getFeaturedPublicEvents() {
  const events = await listPublicEvents()
  return events.filter((event) => event.category === "Upcoming Event" && event.featured)
}

export async function getPublicEventById(eventId: string) {
  noStore()

  const catalogEvent = eventsById[eventId] || null

  try {
    const prisma = getPrismaClient()
    const dbEvent = (await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    })) as DbEventRecord | null

    if (!dbEvent) {
      return catalogEvent
    }

    if (!dbEvent.isActive) {
      return null
    }

    const inventoryMap = await getInventoryMap([eventId])
    const reserved = inventoryMap.get(eventId) || 0
    return mergeEventRecord(catalogEvent, dbEvent, Math.max(dbEvent.capacity - reserved, 0))
  } catch {
    return catalogEvent
  }
}
