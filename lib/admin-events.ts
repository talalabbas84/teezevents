import "server-only"

import { eventsById } from "@/lib/events"
import { getPrismaClient } from "@/lib/prisma"

type ManagedEventRecord = {
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
  createdAt: Date
  updatedAt: Date
}

type ManagedOrderRecord = {
  id: string
  status: "PENDING" | "PAID" | "CANCELED" | "EXPIRED" | "REFUNDED"
  quantity: number
  totalPriceCents: number
  discountAmountCents: number
  expiresAt: Date | null
  ticketTierId: string | null
  ticketTierNameSnapshot: string | null
  voucherId: string | null
  voucherCodeSnapshot: string | null
}

type ManagedTicketRecord = {
  id: string
  checkedInAt: Date | null
}

type ManagedTicketTierRecord = {
  id: string
  name: string
  description: string | null
  priceCents: number
  quantityLimit: number | null
  maxPerOrder: number | null
  sortOrder: number
  isActive: boolean
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
}

type ManagedVoucherRecord = {
  id: string
  code: string
  description: string | null
  discountType: "FIXED" | "PERCENT"
  amountOffCents: number | null
  percentOff: number | null
  minimumQuantity: number | null
  maxRedemptions: number | null
  startsAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type AdminManagedTicketTier = ManagedTicketTierRecord & {
  soldCount: number
  reservedCount: number
  spotsLeft: number | null
  revenueCents: number
}

export type AdminManagedVoucher = ManagedVoucherRecord & {
  redemptionCount: number
  discountCents: number
}

export type AdminManagedEvent = ManagedEventRecord & {
  paidOrders: number
  ticketsIssued: number
  checkedInCount: number
  reservedTickets: number
  spotsLeft: number
  revenueCents: number
  ticketTiers: AdminManagedTicketTier[]
  vouchers: AdminManagedVoucher[]
}

export type UpsertManagedEventInput = {
  id: string
  title: string
  startsAt?: string
  venue?: string
  address?: string
  hostedBy?: string
  image?: string
  previewDescription?: string
  description?: string
  category: "UPCOMING" | "PAST"
  eventKind: "THEMED" | "SIGNATURE" | "CORPORATE" | "SOCIAL"
  ticketPriceCents: number
  capacity: number
  checkoutEnabled: boolean
  maxTicketsPerOrder: number
  ticketNote?: string
  featured: boolean
  isActive: boolean
  ticketTiers: Array<{
    id?: string
    name: string
    description?: string
    priceCents: number
    quantityLimit?: number
    maxPerOrder?: number
    sortOrder: number
    isActive: boolean
    isHidden: boolean
  }>
  vouchers: Array<{
    id?: string
    code: string
    description?: string
    discountType: "FIXED" | "PERCENT"
    amountOffCents?: number
    percentOff?: number
    minimumQuantity?: number
    maxRedemptions?: number
    startsAt?: string
    expiresAt?: string
    isActive: boolean
  }>
}

function normalizeEventId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeVoucherCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

function getReservedTicketCount(orders: ManagedOrderRecord[]) {
  const now = new Date()

  return orders.reduce((total, order) => {
    if (order.status === "PAID") {
      return total + order.quantity
    }

    if (order.status === "PENDING" && order.expiresAt && order.expiresAt > now) {
      return total + order.quantity
    }

    return total
  }, 0)
}

function getReservedTierCount(orders: ManagedOrderRecord[], tier: ManagedTicketTierRecord) {
  const now = new Date()

  return orders.reduce((total, order) => {
    const matchesTier =
      order.ticketTierId === tier.id || (!order.ticketTierId && order.ticketTierNameSnapshot === tier.name)

    if (!matchesTier) {
      return total
    }

    if (order.status === "PAID") {
      return total + order.quantity
    }

    if (order.status === "PENDING" && order.expiresAt && order.expiresAt > now) {
      return total + order.quantity
    }

    return total
  }, 0)
}

function buildTierStats(event: ManagedEventRecord, orders: ManagedOrderRecord[], tiers: ManagedTicketTierRecord[]) {
  const reservedAcrossEvent = getReservedTicketCount(orders)
  const eventSpotsLeft = Math.max(event.capacity - reservedAcrossEvent, 0)

  return tiers.map((tier) => {
    const soldCount = orders.reduce((total, order) => {
      const matchesTier =
        order.ticketTierId === tier.id || (!order.ticketTierId && order.ticketTierNameSnapshot === tier.name)

      return matchesTier && order.status === "PAID" ? total + order.quantity : total
    }, 0)

    const reservedCount = getReservedTierCount(orders, tier)
    const revenueCents = orders.reduce((total, order) => {
      const matchesTier =
        order.ticketTierId === tier.id || (!order.ticketTierId && order.ticketTierNameSnapshot === tier.name)

      return matchesTier && order.status === "PAID" ? total + order.totalPriceCents : total
    }, 0)

    return {
      ...tier,
      soldCount,
      reservedCount,
      spotsLeft:
        typeof tier.quantityLimit === "number"
          ? Math.max(Math.min(eventSpotsLeft, tier.quantityLimit - reservedCount), 0)
          : null,
      revenueCents,
    } satisfies AdminManagedTicketTier
  })
}

function buildVoucherStats(orders: ManagedOrderRecord[], vouchers: ManagedVoucherRecord[]) {
  return vouchers.map((voucher) => {
    const redemptionCount = orders.reduce((total, order) => {
      const matchesVoucher =
        order.voucherId === voucher.id || (!order.voucherId && order.voucherCodeSnapshot === voucher.code)

      return matchesVoucher && order.status === "PAID" ? total + 1 : total
    }, 0)

    const discountCents = orders.reduce((total, order) => {
      const matchesVoucher =
        order.voucherId === voucher.id || (!order.voucherId && order.voucherCodeSnapshot === voucher.code)

      return matchesVoucher && order.status === "PAID" ? total + order.discountAmountCents : total
    }, 0)

    return {
      ...voucher,
      redemptionCount,
      discountCents,
    } satisfies AdminManagedVoucher
  })
}

function buildTierWriteData(input: UpsertManagedEventInput) {
  const normalized = input.ticketTiers
    .map((tier, index) => ({
      name: tier.name.trim(),
      description: tier.description?.trim() || null,
      priceCents: Math.round(tier.priceCents),
      quantityLimit: typeof tier.quantityLimit === "number" ? tier.quantityLimit : null,
      maxPerOrder: typeof tier.maxPerOrder === "number" ? tier.maxPerOrder : null,
      sortOrder: Number.isFinite(tier.sortOrder) ? tier.sortOrder : index,
      isActive: Boolean(tier.isActive),
      isHidden: Boolean(tier.isHidden),
    }))
    .filter((tier) => tier.name)

  const tierNameSet = new Set<string>()

  normalized.forEach((tier) => {
    const tierKey = tier.name.toLowerCase()

    if (tierNameSet.has(tierKey)) {
      throw new Error(`Ticket tier "${tier.name}" is duplicated.`)
    }

    tierNameSet.add(tierKey)

    if (tier.priceCents <= 0) {
      throw new Error(`Ticket tier "${tier.name}" must be priced above $0.`)
    }

    if (tier.quantityLimit !== null && tier.quantityLimit < 1) {
      throw new Error(`Ticket tier "${tier.name}" must have a positive limit when set.`)
    }

    if (tier.quantityLimit !== null && tier.quantityLimit > input.capacity) {
      throw new Error(`Ticket tier "${tier.name}" cannot exceed event capacity.`)
    }

    if (tier.maxPerOrder !== null && tier.maxPerOrder > input.maxTicketsPerOrder) {
      throw new Error(`Ticket tier "${tier.name}" cannot exceed the event max tickets per order.`)
    }
  })

  return normalized
}

function buildVoucherWriteData(input: UpsertManagedEventInput) {
  const normalized = input.vouchers
    .map((voucher) => ({
      code: normalizeVoucherCode(voucher.code),
      description: voucher.description?.trim() || null,
      discountType: voucher.discountType,
      amountOffCents:
        voucher.discountType === "FIXED" && typeof voucher.amountOffCents === "number"
          ? Math.round(voucher.amountOffCents)
          : null,
      percentOff:
        voucher.discountType === "PERCENT" && typeof voucher.percentOff === "number"
          ? Math.round(voucher.percentOff)
          : null,
      minimumQuantity: typeof voucher.minimumQuantity === "number" ? voucher.minimumQuantity : null,
      maxRedemptions: typeof voucher.maxRedemptions === "number" ? voucher.maxRedemptions : null,
      startsAt: voucher.startsAt ? new Date(voucher.startsAt) : null,
      expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt) : null,
      isActive: Boolean(voucher.isActive),
    }))
    .filter((voucher) => voucher.code)

  const voucherCodeSet = new Set<string>()

  normalized.forEach((voucher) => {
    if (voucherCodeSet.has(voucher.code)) {
      throw new Error(`Voucher code "${voucher.code}" is duplicated.`)
    }

    voucherCodeSet.add(voucher.code)

    if (voucher.discountType === "FIXED" && (!voucher.amountOffCents || voucher.amountOffCents <= 0)) {
      throw new Error(`Voucher "${voucher.code}" needs a fixed amount above $0.`)
    }

    if (
      voucher.discountType === "PERCENT" &&
      (!voucher.percentOff || voucher.percentOff <= 0 || voucher.percentOff > 100)
    ) {
      throw new Error(`Voucher "${voucher.code}" needs a percent discount between 1 and 100.`)
    }

    if (voucher.startsAt && voucher.expiresAt && voucher.startsAt > voucher.expiresAt) {
      throw new Error(`Voucher "${voucher.code}" cannot end before it starts.`)
    }
  })

  return normalized
}

export async function getAdminManagedEvents() {
  const prisma = getPrismaClient()
  const events = await prisma.event.findMany({
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    include: {
      orders: {
        select: {
          id: true,
          status: true,
          quantity: true,
          totalPriceCents: true,
          discountAmountCents: true,
          expiresAt: true,
          ticketTierId: true,
          ticketTierNameSnapshot: true,
          voucherId: true,
          voucherCodeSnapshot: true,
        },
      },
      tickets: {
        select: {
          id: true,
          checkedInAt: true,
        },
      },
      ticketTiers: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      vouchers: {
        orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      },
    },
  })

  return events.map((event) => {
    const orders = event.orders as ManagedOrderRecord[]
    const tickets = event.tickets as ManagedTicketRecord[]
    const ticketTiers = event.ticketTiers as ManagedTicketTierRecord[]
    const vouchers = event.vouchers as ManagedVoucherRecord[]
    const paidOrders = orders.filter((order) => order.status === "PAID")
    const reservedTickets = getReservedTicketCount(orders)
    const checkedInCount = tickets.filter((ticket) => Boolean(ticket.checkedInAt)).length

    return {
      ...(event as ManagedEventRecord),
      paidOrders: paidOrders.length,
      ticketsIssued: tickets.length,
      checkedInCount,
      reservedTickets,
      spotsLeft: Math.max(event.capacity - reservedTickets, 0),
      revenueCents: paidOrders.reduce((total, order) => total + order.totalPriceCents, 0),
      ticketTiers: buildTierStats(event as ManagedEventRecord, orders, ticketTiers),
      vouchers: buildVoucherStats(orders, vouchers),
    } satisfies AdminManagedEvent
  })
}

export async function upsertAdminEvent(input: UpsertManagedEventInput) {
  const prisma = getPrismaClient()
  const normalizedId = normalizeEventId(input.id)

  if (!normalizedId) {
    throw new Error("Event id is required.")
  }

  if (input.maxTicketsPerOrder > input.capacity) {
    throw new Error("Max tickets per order cannot exceed total capacity.")
  }

  const ticketTiers = buildTierWriteData(input)
  const vouchers = buildVoucherWriteData(input)
  const activeTierPrices = ticketTiers.filter((tier) => tier.isActive).map((tier) => tier.priceCents)
  const effectiveTicketPriceCents =
    activeTierPrices.length > 0 ? Math.min(...activeTierPrices) : Math.round(input.ticketPriceCents)

  if (input.checkoutEnabled && effectiveTicketPriceCents <= 0) {
    throw new Error("Checkout-enabled events need either a base ticket price or at least one active paid tier.")
  }

  const activeReservations = await prisma.ticketOrder.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      eventId: normalizedId,
      OR: [
        {
          status: "PAID",
        },
        {
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
      ],
    },
  })

  const reservedTickets = activeReservations._sum.quantity ?? 0

  if (input.capacity < reservedTickets) {
    throw new Error(`Capacity cannot be reduced below ${reservedTickets} reserved ticket(s).`)
  }

  return prisma.event.upsert({
    where: {
      id: normalizedId,
    },
    update: {
      title: input.title,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      venue: input.venue || null,
      address: input.address || null,
      hostedBy: input.hostedBy || null,
      image: input.image || null,
      previewDescription: input.previewDescription || null,
      description: input.description || null,
      category: input.category,
      eventKind: input.eventKind,
      currency: "cad",
      ticketPriceCents: effectiveTicketPriceCents,
      capacity: input.capacity,
      checkoutEnabled: input.checkoutEnabled,
      maxTicketsPerOrder: input.maxTicketsPerOrder,
      ticketNote: input.ticketNote || null,
      featured: input.featured,
      isActive: input.isActive,
      ticketTiers: {
        deleteMany: {},
        create: ticketTiers,
      },
      vouchers: {
        deleteMany: {},
        create: vouchers,
      },
    },
    create: {
      id: normalizedId,
      title: input.title,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      venue: input.venue || null,
      address: input.address || null,
      hostedBy: input.hostedBy || null,
      image: input.image || null,
      previewDescription: input.previewDescription || null,
      description: input.description || null,
      category: input.category,
      eventKind: input.eventKind,
      currency: "cad",
      ticketPriceCents: effectiveTicketPriceCents,
      capacity: input.capacity,
      checkoutEnabled: input.checkoutEnabled,
      maxTicketsPerOrder: input.maxTicketsPerOrder,
      ticketNote: input.ticketNote || null,
      featured: input.featured,
      isActive: input.isActive,
      ticketTiers: {
        create: ticketTiers,
      },
      vouchers: {
        create: vouchers,
      },
    },
  })
}

export async function deleteAdminEvent(eventId: string) {
  const prisma = getPrismaClient()
  const normalizedId = normalizeEventId(eventId)

  if (!normalizedId) {
    throw new Error("Event id is required.")
  }

  const event = await prisma.event.findUnique({
    where: {
      id: normalizedId,
    },
    include: {
      _count: {
        select: {
          orders: true,
          tickets: true,
        },
      },
    },
  })

  if (!event) {
    throw new Error("Event not found.")
  }

  const mustArchive = Boolean(eventsById[normalizedId]) || event._count.orders > 0 || event._count.tickets > 0

  if (mustArchive) {
    const archived = await prisma.event.update({
      where: {
        id: normalizedId,
      },
      data: {
        isActive: false,
        checkoutEnabled: false,
        featured: false,
      },
    })

    return {
      mode: "archived" as const,
      event: archived,
    }
  }

  await prisma.event.delete({
    where: {
      id: normalizedId,
    },
  })

  return {
    mode: "deleted" as const,
    eventId: normalizedId,
  }
}
