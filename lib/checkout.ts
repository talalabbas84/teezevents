import "server-only"

import { eventsById, supportsCheckout, type EventData } from "@/lib/events"
import { getPublicEventById } from "@/lib/public-events"
import { getPrismaClient } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe-server"

const ORDER_HOLD_MINUTES = 30

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
  updatedAt?: Date
}

type TicketTierRecord = {
  id: string
  eventId: string
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

type VoucherRecord = {
  id: string
  eventId: string
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

type TicketRecord = {
  id: string
  ticketCode: string
  orderId: string
  eventId: string
  status: "ISSUED" | "CHECKED_IN"
  holderName: string
  holderEmail: string
  ticketIndex: number
  checkedInAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type TicketOrderRecord = {
  id: string
  orderNumber: string
  accessToken: string | null
  eventId: string
  source: "CHECKOUT" | "ADMIN_COMP"
  internalLabel: string | null
  issuedByAdminEmail: string | null
  eventTitleSnapshot: string
  eventDateSnapshot: string | null
  status: "PENDING" | "PAID" | "CANCELED" | "EXPIRED" | "REFUNDED"
  customerName: string
  customerEmail: string
  customerPhone: string | null
  quantity: number
  unitPriceCents: number
  discountAmountCents: number
  totalPriceCents: number
  currency: string
  ticketTierId: string | null
  ticketTierNameSnapshot: string | null
  voucherId: string | null
  voucherCodeSnapshot: string | null
  stripeCheckoutSessionId: string | null
  stripePaymentIntentId: string | null
  notes: string | null
  ticketEmailSendCount: number
  ticketEmailLastSentAt: Date | null
  ticketEmailLastSentTo: string | null
  expiresAt: Date | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type OrderWithEvent = TicketOrderRecord & {
  event: DbEventRecord
  tickets: TicketRecord[]
}

type TicketWithRelations = TicketRecord & {
  event: DbEventRecord
  order: OrderWithEvent
}

export type CheckoutTierOption = {
  id: string
  name: string
  description: string | null
  priceCents: number
  priceLabel: string
  quantityLimit: number | null
  maxPerOrder: number | null
  available: number
  isHidden: boolean
}

type CheckoutQuote = {
  event: DbEventRecord
  quantity: number
  unitPriceCents: number
  subtotalCents: number
  discountAmountCents: number
  totalPriceCents: number
  currency: string
  selectedTier: TicketTierRecord | null
  voucher: VoucherRecord | null
  availableTickets: number
  maxTicketsPerOrder: number
}

type AdminEventSummary = {
  id: string
  title: string
  startsAt: Date | null
  capacity: number
  paidOrders: number
  ticketsIssued: number
  checkedInCount: number
  ticketsPendingEntry: number
  revenueCents: number
  remainingCapacity: number
  sellThroughRate: number
  checkInRate: number
}

type AdminTimelinePoint = {
  label: string
  orders?: number
  tickets?: number
  revenueCents?: number
  checkedInCount?: number
}

type AdminDashboardData = {
  summary: {
    paidOrders: number
    compOrders: number
    complimentaryTickets: number
    pendingOrders: number
    pendingTickets: number
    deliveredOrders: number
    ticketsIssued: number
    checkedInCount: number
    grossRevenueCents: number
    totalCapacity: number
    remainingCapacity: number
    sellThroughRate: number
    checkInRate: number
    averageOrderValueCents: number
    ticketDeliveryRate: number
    discountAmountCents: number
  }
  events: AdminEventSummary[]
  salesTimeline: AdminTimelinePoint[]
  checkInTimeline: AdminTimelinePoint[]
  recentOrders: OrderWithEvent[]
  recentTickets: TicketWithRelations[]
  recentCheckIns: TicketWithRelations[]
  topTicketTiers: Array<{
    label: string
    tickets: number
    revenueCents: number
  }>
  voucherUsage: Array<{
    code: string
    orders: number
    discountAmountCents: number
  }>
}

type CheckoutSetupIssue = {
  title: string
  description: string
  action?: string
}

type CheckoutRequest = {
  eventId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  quantity: number
  ticketTierId?: string
  voucherCode?: string
  notes?: string
  baseUrl: string
}

type ComplimentaryOrderRequest = {
  eventId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  quantity: number
  notes?: string
  internalLabel?: string
  issuedByAdminEmail: string
}

type UpdateAdminOrderInput = {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  notes?: string
  internalLabel?: string
  quantity?: number
}

type CreatedOrder = {
  event: DbEventRecord
  order: OrderWithEvent
}

type AggregateResult = {
  _sum: {
    quantity: number | null
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function buildOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = crypto.randomUUID().split("-")[0].toUpperCase()

  return `TEEZ-${stamp}-${suffix}`
}

function buildTicketCode(orderNumber: string, ticketIndex: number) {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
  const compactOrder = orderNumber.replace(/[^A-Z0-9]/g, "").slice(-8)

  return `TKT-${compactOrder}-${String(ticketIndex).padStart(2, "0")}-${suffix}`
}

function buildDbEventData(event: EventData): Omit<DbEventRecord, "createdAt" | "updatedAt"> {
  if (!supportsCheckout(event) || !event.ticketPriceCents || !event.currency || !event.capacity) {
    throw new Error("This event is not available for checkout.")
  }

  const category = event.category === "Past Event" ? "PAST" : "UPCOMING"
  const eventKind =
    event.type === "themed"
      ? "THEMED"
      : event.type === "signature"
        ? "SIGNATURE"
        : event.type === "corporate"
          ? "CORPORATE"
          : "SOCIAL"

  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAtIso ? new Date(event.startsAtIso) : null,
    venue: event.venue || null,
    address: event.address || event.location,
    hostedBy: event.hostedBy || null,
    image: event.image || null,
    previewDescription: event.previewDescription || null,
    description: event.description || null,
    category,
    eventKind,
    currency: event.currency.toLowerCase(),
    ticketPriceCents: event.ticketPriceCents,
    capacity: event.capacity,
    checkoutEnabled: Boolean(event.checkoutEnabled),
    maxTicketsPerOrder: event.maxTicketsPerOrder || 4,
    ticketNote: event.ticketNote || null,
    featured: Boolean(event.featured),
    isActive: true,
  }
}

function clampRate(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }

  return Math.max(0, Math.min(1, numerator / denominator))
}

function buildTimelineLabel(date: Date) {
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
}

export function normalizeTicketCodeInput(rawInput: string) {
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return null
  }

  const pathMatch = trimmed.match(/\/tickets\/code\/([^/?#]+)/i)

  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]).trim().toUpperCase()
  }

  try {
    const url = new URL(trimmed)
    const urlPathMatch = url.pathname.match(/\/tickets\/code\/([^/?#]+)/i)

    if (urlPathMatch?.[1]) {
      return decodeURIComponent(urlPathMatch[1]).trim().toUpperCase()
    }
  } catch {
    // Fall back to treating the input as a raw ticket code.
  }

  return trimmed.toUpperCase()
}

export async function getCheckoutEvent(eventId: string) {
  const event = await getPublicEventById(eventId)

  if (!event || !supportsCheckout(event) || !event.ticketPriceCents || !event.currency || !event.capacity) {
    return null
  }

  return event
}

function withOrderIncludes() {
  return {
    event: true,
    tickets: {
      orderBy: {
        ticketIndex: "asc",
      },
    },
  } as const
}

async function findOrderByUnique(where: Record<string, string>) {
  const prisma = getPrismaClient()

  return (await prisma.ticketOrder.findUnique({
    where,
    include: withOrderIncludes(),
  })) as OrderWithEvent | null
}

async function ensureTicketsForOrder(tx: any, order: OrderWithEvent) {
  const existingTickets = (await tx.ticket.findMany({
    where: {
      orderId: order.id,
    },
    orderBy: {
      ticketIndex: "asc",
    },
  })) as TicketRecord[]

  if (existingTickets.length >= order.quantity) {
    return existingTickets
  }

  for (let ticketIndex = existingTickets.length + 1; ticketIndex <= order.quantity; ticketIndex += 1) {
    await tx.ticket.create({
      data: {
        ticketCode: buildTicketCode(order.orderNumber, ticketIndex),
        orderId: order.id,
        eventId: order.eventId,
        status: "ISSUED",
        holderName: order.customerName,
        holderEmail: order.customerEmail,
        ticketIndex,
      },
    })
  }

  return (await tx.ticket.findMany({
    where: {
      orderId: order.id,
    },
    orderBy: {
      ticketIndex: "asc",
    },
  })) as TicketRecord[]
}

export function formatCurrency(amountInCents: number, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

function normalizeVoucherCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

function getTierAvailableInventory(
  tier: Pick<TicketTierRecord, "quantityLimit">,
  eventAvailable: number,
  reservedOnTier: number,
) {
  if (typeof tier.quantityLimit !== "number") {
    return eventAvailable
  }

  return Math.max(Math.min(eventAvailable, tier.quantityLimit - reservedOnTier), 0)
}

function buildCheckoutTierOptions(
  eventAvailable: number,
  tiers: TicketTierRecord[],
  tierReservationMap: Map<string, number>,
) {
  return tiers
    .filter((tier) => !tier.isHidden)
    .map((tier) => {
      const available = getTierAvailableInventory(tier, eventAvailable, tierReservationMap.get(tier.id) || 0)

      return {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        priceCents: tier.priceCents,
        priceLabel: formatCurrency(tier.priceCents, "cad"),
        quantityLimit: tier.quantityLimit,
        maxPerOrder: tier.maxPerOrder,
        available,
        isHidden: tier.isHidden,
      } satisfies CheckoutTierOption
    })
}

export function getCheckoutSetupIssue(error: unknown): CheckoutSetupIssue {
  const message = getErrorMessage(error)

  if (/does not exist in the current database|The table `public\./i.test(message)) {
    return {
      title: "Checkout database tables are missing.",
      description:
        "Stripe and Postgres are configured, but Prisma has not created the Event, TicketOrder, and Ticket tables in your database yet.",
      action: 'Run "pnpm db:push", then "pnpm db:backfill-access-tokens", then "pnpm db:seed".',
    }
  }

  if (/The column `.+` does not exist|P2022|Unknown field|Invalid `prisma\./i.test(message)) {
    return {
      title: "Checkout database schema is out of date.",
      description:
        "The app code expects newer Event or TicketOrder columns than the current database has. This usually happens after a schema change when Prisma push has not completed cleanly yet.",
      action: 'Run "pnpm db:push", then "pnpm db:backfill-access-tokens", then "pnpm db:seed".',
    }
  }

  if (/Environment variable not found: (DIRECT_URL|DATABASE_URL)|Missing DATABASE_URL|Missing DIRECT_URL/i.test(message)) {
    return {
      title: "Database environment variables are missing.",
      description: "The server cannot connect to Postgres until DATABASE_URL and DIRECT_URL are available at runtime.",
      action: "Add both database URLs to your local env file and Vercel project settings.",
    }
  }

  if (/@prisma\/client did not initialize yet|Cannot find module '\.prisma|prisma generate/i.test(message)) {
    return {
      title: "Prisma client is not generated yet.",
      description: "The app cannot talk to Postgres until Prisma dependencies are installed and the client is generated.",
      action: 'Run "pnpm install" and then "pnpm db:generate".',
    }
  }

  if (/Missing STRIPE_SECRET_KEY/i.test(message)) {
    return {
      title: "Stripe secret key is missing.",
      description: "The checkout flow needs a valid server-side Stripe secret key before it can create Checkout Sessions.",
      action: 'Add STRIPE_SECRET_KEY to ".env.local" and your Vercel project envs.',
    }
  }

  return {
    title: "Checkout is temporarily unavailable.",
    description:
      "The event page is ready for secure card checkout, but the database or Stripe configuration has not been completed yet.",
    action: "Use the manual RSVP path for now, or finish the Postgres and Stripe setup and come back here.",
  }
}

async function getReservedTicketCount(eventId: string) {
  const prisma = getPrismaClient()
  const now = new Date()
  const aggregate = (await prisma.ticketOrder.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      eventId,
      OR: [
        { status: "PAID" },
        {
          status: "PENDING",
          expiresAt: {
            gt: now,
          },
        },
      ],
    },
  })) as AggregateResult

  return aggregate._sum.quantity ?? 0
}

async function getActiveTicketTiers(eventId: string) {
  const prisma = getPrismaClient()

  return (await prisma.ticketTier.findMany({
    where: {
      eventId,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })) as TicketTierRecord[]
}

async function getTierReservationMap(eventId: string) {
  const prisma = getPrismaClient()
  const now = new Date()
  const reservations = await prisma.ticketOrder.findMany({
    where: {
      eventId,
      ticketTierId: {
        not: null,
      },
      OR: [
        { status: "PAID" },
        {
          status: "PENDING",
          expiresAt: {
            gt: now,
          },
        },
      ],
    },
    select: {
      ticketTierId: true,
      quantity: true,
    },
  })

  const totals = new Map<string, number>()

  reservations.forEach((reservation) => {
    if (!reservation.ticketTierId) {
      return
    }

    totals.set(reservation.ticketTierId, (totals.get(reservation.ticketTierId) || 0) + reservation.quantity)
  })

  return totals
}

export async function syncCheckoutEventRecord(eventId: string) {
  const prisma = getPrismaClient()
  const existing = (await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  })) as DbEventRecord | null

  if (existing) {
    return existing
  }

  const catalogEvent = eventsById[eventId]

  if (!catalogEvent) {
    throw new Error("This event is not available for checkout.")
  }

  const data = buildDbEventData(catalogEvent)

  return (await prisma.event.create({
    data,
  })) as DbEventRecord
}

export async function getEventInventorySnapshot(eventId: string) {
  const event = await getCheckoutEvent(eventId)

  if (!event || !event.capacity) {
    return null
  }

  const dbEvent = await syncCheckoutEventRecord(eventId)
  const reserved = await getReservedTicketCount(dbEvent.id)
  const ticketTiers = await getActiveTicketTiers(dbEvent.id)
  const tierReservationMap = ticketTiers.length > 0 ? await getTierReservationMap(dbEvent.id) : new Map<string, number>()
  const available = Math.max(dbEvent.capacity - reserved, 0)
  const checkoutTierOptions = buildCheckoutTierOptions(available, ticketTiers, tierReservationMap)

  return {
    reserved,
    available,
    capacity: dbEvent.capacity,
    unitPriceCents: dbEvent.ticketPriceCents,
    currency: dbEvent.currency,
    ticketTiers: checkoutTierOptions,
    defaultTierId: checkoutTierOptions[0]?.id || null,
  }
}

export async function getCheckoutQuote({
  eventId,
  quantity,
  ticketTierId,
  voucherCode,
}: {
  eventId: string
  quantity: number
  ticketTierId?: string
  voucherCode?: string
}): Promise<CheckoutQuote> {
  const prisma = getPrismaClient()
  const checkoutEvent = await getCheckoutEvent(eventId)

  if (!checkoutEvent || !checkoutEvent.capacity || !checkoutEvent.ticketPriceCents || !checkoutEvent.currency) {
    throw new Error("This event is not available for checkout.")
  }

  const event = await syncCheckoutEventRecord(eventId)
  const reserved = await getReservedTicketCount(event.id)
  const eventAvailable = Math.max(event.capacity - reserved, 0)
  const tiers = await getActiveTicketTiers(event.id)
  const tierReservationMap = tiers.length > 0 ? await getTierReservationMap(event.id) : new Map<string, number>()
  const publicTierOptions = buildCheckoutTierOptions(eventAvailable, tiers, tierReservationMap)
  const selectedTier =
    ticketTierId && ticketTierId.trim()
      ? tiers.find((tier) => tier.id === ticketTierId && !tier.isHidden) || null
      : (tiers.find((tier) => !tier.isHidden) ?? null)

  if (ticketTierId && !selectedTier) {
    throw new Error("Selected ticket tier is unavailable.")
  }

  const availableTickets = selectedTier
    ? getTierAvailableInventory(selectedTier, eventAvailable, tierReservationMap.get(selectedTier.id) || 0)
    : eventAvailable
  const maxTicketsPerOrder = Math.max(
    1,
    Math.min(event.maxTicketsPerOrder, selectedTier?.maxPerOrder || event.maxTicketsPerOrder),
  )

  if (quantity > maxTicketsPerOrder) {
    throw new Error(
      selectedTier
        ? `You can buy up to ${maxTicketsPerOrder} ticket(s) for ${selectedTier.name}.`
        : `You can buy up to ${maxTicketsPerOrder} ticket(s) per order.`,
    )
  }

  if (availableTickets < quantity) {
    throw new Error(
      availableTickets > 0
        ? `Only ${availableTickets} ticket(s) remain${selectedTier ? ` for ${selectedTier.name}` : ""}.`
        : selectedTier
          ? `${selectedTier.name} is sold out.`
          : "This event is sold out.",
    )
  }

  const unitPriceCents = selectedTier?.priceCents || event.ticketPriceCents
  const subtotalCents = unitPriceCents * quantity
  let voucher: VoucherRecord | null = null
  let discountAmountCents = 0

  if (voucherCode?.trim()) {
    const normalizedCode = normalizeVoucherCode(voucherCode)
    voucher = (await prisma.voucher.findFirst({
      where: {
        eventId: event.id,
        code: normalizedCode,
        isActive: true,
      },
    })) as VoucherRecord | null

    if (!voucher) {
      throw new Error("Voucher code is invalid.")
    }

    const now = new Date()

    if (voucher.startsAt && voucher.startsAt > now) {
      throw new Error("This voucher is not active yet.")
    }

    if (voucher.expiresAt && voucher.expiresAt < now) {
      throw new Error("This voucher has expired.")
    }

    if (voucher.minimumQuantity && quantity < voucher.minimumQuantity) {
      throw new Error(`This voucher requires at least ${voucher.minimumQuantity} ticket(s).`)
    }

    if (voucher.maxRedemptions) {
      const redemptionCount = await prisma.ticketOrder.count({
        where: {
          eventId: event.id,
          AND: [
            {
              OR: [{ voucherId: voucher.id }, { voucherCodeSnapshot: voucher.code }],
            },
            {
              OR: [
                { status: "PAID" },
                {
                  status: "PENDING",
                  expiresAt: {
                    gt: now,
                  },
                },
              ],
            },
          ],
        },
      })

      if (redemptionCount >= voucher.maxRedemptions) {
        throw new Error("This voucher has reached its redemption limit.")
      }
    }

    discountAmountCents =
      voucher.discountType === "FIXED"
        ? Math.min(subtotalCents, voucher.amountOffCents || 0)
        : Math.min(subtotalCents, Math.round(subtotalCents * ((voucher.percentOff || 0) / 100)))
  }

  if (publicTierOptions.length > 0 && !selectedTier) {
    throw new Error("A ticket tier must be selected before checkout.")
  }

  if (Math.max(subtotalCents - discountAmountCents, 0) <= 0) {
    throw new Error("This voucher reduces the order to $0. Issue complimentary tickets from the admin dashboard instead.")
  }

  return {
    event,
    quantity,
    unitPriceCents,
    subtotalCents,
    discountAmountCents,
    totalPriceCents: Math.max(subtotalCents - discountAmountCents, 0),
    currency: event.currency,
    selectedTier,
    voucher,
    availableTickets,
    maxTicketsPerOrder,
  }
}

export async function createStripeCheckoutForOrder(input: CheckoutRequest) {
  const prisma = getPrismaClient()
  const checkoutEvent = await getCheckoutEvent(input.eventId)

  if (!checkoutEvent || !checkoutEvent.capacity || !checkoutEvent.ticketPriceCents || !checkoutEvent.currency) {
    throw new Error("This event is not available for checkout.")
  }

  const now = new Date()

  const createdOrder = await prisma.$transaction(
    async (tx): Promise<CreatedOrder> => {
      const event = (await tx.event.upsert({
        where: { id: checkoutEvent.id },
        update: {
          title: checkoutEvent.title,
          startsAt: checkoutEvent.startsAtIso ? new Date(checkoutEvent.startsAtIso) : null,
          venue: checkoutEvent.venue || null,
          address: checkoutEvent.address || checkoutEvent.location,
          hostedBy: checkoutEvent.hostedBy || null,
          image: checkoutEvent.image || null,
          previewDescription: checkoutEvent.previewDescription,
          description: checkoutEvent.description,
          category: checkoutEvent.category === "Past Event" ? "PAST" : "UPCOMING",
          eventKind:
            checkoutEvent.type === "themed"
              ? "THEMED"
              : checkoutEvent.type === "signature"
                ? "SIGNATURE"
                : checkoutEvent.type === "corporate"
                  ? "CORPORATE"
                  : "SOCIAL",
          currency: checkoutEvent.currency.toLowerCase(),
          ticketPriceCents: checkoutEvent.ticketPriceCents,
          capacity: checkoutEvent.capacity,
          checkoutEnabled: Boolean(checkoutEvent.checkoutEnabled),
          maxTicketsPerOrder: checkoutEvent.maxTicketsPerOrder || 4,
          ticketNote: checkoutEvent.ticketNote || null,
          featured: Boolean(checkoutEvent.featured),
          isActive: true,
        },
        create: buildDbEventData(checkoutEvent),
      })) as DbEventRecord

      const activeReservations = (await tx.ticketOrder.aggregate({
        _sum: {
          quantity: true,
        },
        where: {
          eventId: event.id,
          OR: [
            { status: "PAID" },
            {
              status: "PENDING",
              expiresAt: {
                gt: now,
              },
            },
          ],
        },
      })) as AggregateResult

      const reservedCount = activeReservations._sum.quantity ?? 0
      const eventAvailable = Math.max(event.capacity - reservedCount, 0)
      const selectedTier = input.ticketTierId
        ? ((await tx.ticketTier.findFirst({
            where: {
              id: input.ticketTierId,
              eventId: event.id,
              isActive: true,
              isHidden: false,
            },
          })) as TicketTierRecord | null)
        : null

      if (input.ticketTierId && !selectedTier) {
        throw new Error("Selected ticket tier is unavailable.")
      }

      let availableTickets = eventAvailable
      let maxTicketsPerOrder = event.maxTicketsPerOrder

      if (selectedTier) {
        const tierReservations = (await tx.ticketOrder.aggregate({
          _sum: {
            quantity: true,
          },
          where: {
            eventId: event.id,
            ticketTierId: selectedTier.id,
            OR: [
              { status: "PAID" },
              {
                status: "PENDING",
                expiresAt: {
                  gt: now,
                },
              },
            ],
          },
        })) as AggregateResult

        availableTickets = getTierAvailableInventory(selectedTier, eventAvailable, tierReservations._sum.quantity ?? 0)
        maxTicketsPerOrder = Math.max(1, Math.min(event.maxTicketsPerOrder, selectedTier.maxPerOrder || event.maxTicketsPerOrder))
      }

      if (input.quantity > maxTicketsPerOrder) {
        throw new Error(
          selectedTier
            ? `You can buy up to ${maxTicketsPerOrder} ticket(s) for ${selectedTier.name}.`
            : `You can buy up to ${maxTicketsPerOrder} ticket(s) per order.`,
        )
      }

      if (availableTickets < input.quantity) {
        throw new Error(
          availableTickets > 0
            ? `Only ${availableTickets} ticket(s) remain${selectedTier ? ` for ${selectedTier.name}` : ""}.`
            : selectedTier
              ? `${selectedTier.name} is sold out.`
              : "This event is sold out.",
        )
      }

      const unitPriceCents = selectedTier?.priceCents || event.ticketPriceCents
      const subtotalCents = unitPriceCents * input.quantity
      let voucher: VoucherRecord | null = null
      let discountAmountCents = 0

      if (input.voucherCode?.trim()) {
        const normalizedCode = normalizeVoucherCode(input.voucherCode)
        voucher = (await tx.voucher.findFirst({
          where: {
            eventId: event.id,
            code: normalizedCode,
            isActive: true,
          },
        })) as VoucherRecord | null

        if (!voucher) {
          throw new Error("Voucher code is invalid.")
        }

        if (voucher.startsAt && voucher.startsAt > now) {
          throw new Error("This voucher is not active yet.")
        }

        if (voucher.expiresAt && voucher.expiresAt < now) {
          throw new Error("This voucher has expired.")
        }

        if (voucher.minimumQuantity && input.quantity < voucher.minimumQuantity) {
          throw new Error(`This voucher requires at least ${voucher.minimumQuantity} ticket(s).`)
        }

        if (voucher.maxRedemptions) {
          const redemptionCount = await tx.ticketOrder.count({
            where: {
              eventId: event.id,
              AND: [
                {
                  OR: [{ voucherId: voucher.id }, { voucherCodeSnapshot: voucher.code }],
                },
                {
                  OR: [
                    { status: "PAID" },
                    {
                      status: "PENDING",
                      expiresAt: {
                        gt: now,
                      },
                    },
                  ],
                },
              ],
            },
          })

          if (redemptionCount >= voucher.maxRedemptions) {
            throw new Error("This voucher has reached its redemption limit.")
          }
        }

        discountAmountCents =
          voucher.discountType === "FIXED"
            ? Math.min(subtotalCents, voucher.amountOffCents || 0)
            : Math.min(subtotalCents, Math.round(subtotalCents * ((voucher.percentOff || 0) / 100)))
      }

      if (Math.max(subtotalCents - discountAmountCents, 0) <= 0) {
        throw new Error("This voucher reduces the order to $0. Issue complimentary tickets from the admin dashboard instead.")
      }

      const order = (await tx.ticketOrder.create({
        data: {
          orderNumber: buildOrderNumber(),
          eventId: event.id,
          eventTitleSnapshot: checkoutEvent.title,
          eventDateSnapshot: checkoutEvent.date,
          status: "PENDING",
          customerName: input.customerName,
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: input.customerPhone || null,
          quantity: input.quantity,
          unitPriceCents,
          discountAmountCents,
          totalPriceCents: Math.max(subtotalCents - discountAmountCents, 0),
          currency: event.currency,
          ticketTierId: selectedTier?.id || null,
          ticketTierNameSnapshot: selectedTier?.name || null,
          voucherId: voucher?.id || null,
          voucherCodeSnapshot: voucher?.code || null,
          notes: input.notes || null,
          expiresAt: addMinutes(now, ORDER_HOLD_MINUTES),
        },
        include: withOrderIncludes(),
      })) as OrderWithEvent

      return { event, order }
    },
    {
      isolationLevel: "Serializable",
    },
  )

  const stripe = getStripeClient()

  try {
    const session = (await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${input.baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.baseUrl}/checkout/cancel?event=${checkoutEvent.id}`,
      customer_email: input.customerEmail,
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: "auto",
      metadata: {
        orderId: createdOrder.order.id,
        orderNumber: createdOrder.order.orderNumber,
        accessToken: createdOrder.order.accessToken,
        eventId: checkoutEvent.id,
        ticketTier: createdOrder.order.ticketTierNameSnapshot || "",
        voucherCode: createdOrder.order.voucherCodeSnapshot || "",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: createdOrder.event.currency,
            unit_amount: createdOrder.order.totalPriceCents,
            product_data: {
              name: createdOrder.order.ticketTierNameSnapshot
                ? `${checkoutEvent.title} — ${createdOrder.order.ticketTierNameSnapshot}`
                : checkoutEvent.title,
              description: [
                `${input.quantity} ticket(s)`,
                `${checkoutEvent.shortDate}${checkoutEvent.time ? ` at ${checkoutEvent.time}` : ""}`,
                createdOrder.order.voucherCodeSnapshot ? `Code ${createdOrder.order.voucherCodeSnapshot} applied` : null,
              ]
                .filter(Boolean)
                .join(" • "),
            },
          },
        },
      ],
      expires_at: Math.floor((createdOrder.order.expiresAt ?? addMinutes(now, ORDER_HOLD_MINUTES)).getTime() / 1000),
    })) as {
      id: string
      url?: string | null
    }

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.")
    }

    await prisma.ticketOrder.update({
      where: { id: createdOrder.order.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    })

    return {
      checkoutUrl: session.url,
      orderId: createdOrder.order.id,
      accessToken: createdOrder.order.accessToken,
      sessionId: session.id,
    }
  } catch (error) {
    await prisma.ticketOrder
      .update({
        where: { id: createdOrder.order.id },
        data: {
          status: "CANCELED",
        },
      })
      .catch(() => null)

    throw error
  }
}

export async function createComplimentaryOrder(input: ComplimentaryOrderRequest) {
  const prisma = getPrismaClient()
  const checkoutEvent = await getCheckoutEvent(input.eventId)

  if (!checkoutEvent || !checkoutEvent.capacity || !checkoutEvent.currency) {
    throw new Error("This event is not available for ticket issuance.")
  }

  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const event = (await tx.event.upsert({
      where: { id: checkoutEvent.id },
      update: {
        title: checkoutEvent.title,
        startsAt: checkoutEvent.startsAtIso ? new Date(checkoutEvent.startsAtIso) : null,
        venue: checkoutEvent.venue || null,
        address: checkoutEvent.address || checkoutEvent.location,
        hostedBy: checkoutEvent.hostedBy || null,
        image: checkoutEvent.image || null,
        previewDescription: checkoutEvent.previewDescription,
        description: checkoutEvent.description,
        category: checkoutEvent.category === "Past Event" ? "PAST" : "UPCOMING",
        eventKind:
          checkoutEvent.type === "themed"
            ? "THEMED"
            : checkoutEvent.type === "signature"
              ? "SIGNATURE"
              : checkoutEvent.type === "corporate"
                ? "CORPORATE"
                : "SOCIAL",
        currency: checkoutEvent.currency.toLowerCase(),
        ticketPriceCents: checkoutEvent.ticketPriceCents || 0,
        capacity: checkoutEvent.capacity,
        checkoutEnabled: Boolean(checkoutEvent.checkoutEnabled),
        maxTicketsPerOrder: checkoutEvent.maxTicketsPerOrder || 4,
        ticketNote: checkoutEvent.ticketNote || null,
        featured: Boolean(checkoutEvent.featured),
        isActive: true,
      },
      create: buildDbEventData(checkoutEvent),
    })) as DbEventRecord

    const activeReservations = (await tx.ticketOrder.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        eventId: event.id,
        OR: [
          { status: "PAID" },
          {
            status: "PENDING",
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
    })) as AggregateResult

    const reservedCount = activeReservations._sum.quantity ?? 0
    const remaining = Math.max(event.capacity - reservedCount, 0)

    if (remaining < input.quantity) {
      throw new Error(remaining > 0 ? `Only ${remaining} ticket(s) remain for this event.` : "This event is sold out.")
    }

    const order = (await tx.ticketOrder.create({
      data: {
        orderNumber: buildOrderNumber(),
        eventId: event.id,
        source: "ADMIN_COMP",
        internalLabel: input.internalLabel || "Complimentary",
        issuedByAdminEmail: input.issuedByAdminEmail.toLowerCase(),
        eventTitleSnapshot: checkoutEvent.title,
        eventDateSnapshot: checkoutEvent.date,
        status: "PAID",
        customerName: input.customerName,
        customerEmail: input.customerEmail.toLowerCase(),
        customerPhone: input.customerPhone || null,
        quantity: input.quantity,
        unitPriceCents: 0,
        totalPriceCents: 0,
        currency: event.currency,
        notes: input.notes || null,
        expiresAt: null,
        paidAt: now,
      },
      include: withOrderIncludes(),
    })) as OrderWithEvent

    const tickets = await ensureTicketsForOrder(tx, order)

    return {
      ...order,
      tickets,
    } satisfies OrderWithEvent
  })
}

export async function finalizePaidOrderFromCheckoutSession(sessionId: string, paymentIntentId?: string | null) {
  const prisma = getPrismaClient()

  return prisma.$transaction(async (tx) => {
    const existingOrder = (await tx.ticketOrder.findUnique({
      where: {
        stripeCheckoutSessionId: sessionId,
      },
      include: withOrderIncludes(),
    })) as OrderWithEvent | null

    if (!existingOrder) {
      return null
    }

    const paidAt = existingOrder.paidAt || new Date()
    const updatedOrder =
      existingOrder.status === "PAID" && existingOrder.tickets.length >= existingOrder.quantity
        ? existingOrder
        : ((await tx.ticketOrder.update({
            where: {
              id: existingOrder.id,
            },
            data: {
              status: "PAID",
              paidAt,
              stripePaymentIntentId: paymentIntentId || existingOrder.stripePaymentIntentId || null,
              expiresAt: null,
            },
            include: withOrderIncludes(),
          })) as OrderWithEvent)

    const tickets = await ensureTicketsForOrder(tx, updatedOrder)

    return {
      ...updatedOrder,
      tickets,
    } satisfies OrderWithEvent
  })
}

export async function ensurePaidOrderTicketsById(orderId: string) {
  const prisma = getPrismaClient()

  return prisma.$transaction(async (tx) => {
    const existingOrder = (await tx.ticketOrder.findUnique({
      where: {
        id: orderId,
      },
      include: withOrderIncludes(),
    })) as OrderWithEvent | null

    if (!existingOrder) {
      return null
    }

    if (existingOrder.status !== "PAID") {
      return existingOrder
    }

    const tickets = await ensureTicketsForOrder(tx, existingOrder)

    return {
      ...existingOrder,
      tickets,
    } satisfies OrderWithEvent
  })
}

export async function updateAdminOrder(input: UpdateAdminOrderInput) {
  const prisma = getPrismaClient()

  return prisma.$transaction(async (tx) => {
    const existingOrder = (await tx.ticketOrder.findUnique({
      where: {
        id: input.orderId,
      },
      include: withOrderIncludes(),
    })) as OrderWithEvent | null

    if (!existingOrder) {
      throw new Error("Order not found.")
    }

    let nextQuantity = existingOrder.quantity

    if (typeof input.quantity === "number" && input.quantity !== existingOrder.quantity) {
      if (existingOrder.source !== "ADMIN_COMP") {
        throw new Error("Quantity can only be edited for complimentary/admin-issued orders.")
      }

      if (input.quantity < 1) {
        throw new Error("Order quantity must be at least 1.")
      }

      const checkedInCount = existingOrder.tickets.filter((ticket) => Boolean(ticket.checkedInAt)).length

      if (input.quantity < checkedInCount) {
        throw new Error(`This order already has ${checkedInCount} checked-in ticket(s). Quantity cannot go below that.`)
      }

      if (input.quantity > existingOrder.quantity) {
        const aggregate = (await tx.ticketOrder.aggregate({
          _sum: {
            quantity: true,
          },
          where: {
            eventId: existingOrder.eventId,
            id: {
              not: existingOrder.id,
            },
            OR: [
              { status: "PAID" },
              {
                status: "PENDING",
                expiresAt: {
                  gt: new Date(),
                },
              },
            ],
          },
        })) as AggregateResult

        const reservedElsewhere = aggregate._sum.quantity ?? 0
        const available = Math.max(existingOrder.event.capacity - reservedElsewhere - existingOrder.quantity, 0)
        const requestedExtra = input.quantity - existingOrder.quantity

        if (available < requestedExtra) {
          throw new Error(
            available > 0 ? `Only ${available} additional ticket(s) can be added for this event.` : "This event is sold out.",
          )
        }
      }

      if (input.quantity < existingOrder.quantity) {
        const removableTickets = [...existingOrder.tickets]
          .sort((left, right) => right.ticketIndex - left.ticketIndex)
          .slice(0, existingOrder.quantity - input.quantity)

        if (removableTickets.some((ticket) => Boolean(ticket.checkedInAt))) {
          throw new Error("Checked-in tickets cannot be removed from this order.")
        }

        if (removableTickets.length > 0) {
          await tx.ticket.deleteMany({
            where: {
              id: {
                in: removableTickets.map((ticket) => ticket.id),
              },
            },
          })
        }
      }

      nextQuantity = input.quantity
    }

    const updatedOrder = (await tx.ticketOrder.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        customerName: input.customerName,
        customerEmail: input.customerEmail.toLowerCase(),
        customerPhone: input.customerPhone || null,
        notes: input.notes || null,
        internalLabel:
          existingOrder.source === "ADMIN_COMP"
            ? input.internalLabel || "Complimentary"
            : input.internalLabel || existingOrder.internalLabel || null,
        quantity: nextQuantity,
      },
      include: withOrderIncludes(),
    })) as OrderWithEvent

    await tx.ticket.updateMany({
      where: {
        orderId: updatedOrder.id,
      },
      data: {
        holderName: updatedOrder.customerName,
        holderEmail: updatedOrder.customerEmail,
      },
    })

    const tickets =
      updatedOrder.source === "ADMIN_COMP" && nextQuantity > updatedOrder.tickets.length
        ? await ensureTicketsForOrder(tx, updatedOrder)
        : ((await tx.ticket.findMany({
            where: {
              orderId: updatedOrder.id,
            },
            orderBy: {
              ticketIndex: "asc",
            },
          })) as TicketRecord[])

    return {
      ...updatedOrder,
      tickets,
    } satisfies OrderWithEvent
  })
}

export async function syncOrderPaymentStatusFromCheckoutSession(sessionId: string) {
  const currentOrder = await getOrderBySessionId(sessionId)

  if (!currentOrder) {
    return null
  }

  if (currentOrder.status === "PAID" && currentOrder.tickets.length >= currentOrder.quantity) {
    return currentOrder
  }

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null

  if (session.payment_status === "paid" || (session.status === "complete" && paymentIntentId)) {
    return finalizePaidOrderFromCheckoutSession(session.id, paymentIntentId)
  }

  if (session.status === "expired") {
    await markOrderExpiredFromCheckoutSession(session.id)
  }

  return getOrderBySessionId(sessionId)
}

export async function markOrderExpiredFromCheckoutSession(sessionId: string) {
  const prisma = getPrismaClient()
  const existingOrder = (await prisma.ticketOrder.findUnique({
    where: {
      stripeCheckoutSessionId: sessionId,
    },
  })) as TicketOrderRecord | null

  if (!existingOrder || existingOrder.status === "PAID") {
    return existingOrder
  }

  return prisma.ticketOrder.update({
    where: {
      stripeCheckoutSessionId: sessionId,
    },
    data: {
      status: "EXPIRED",
      expiresAt: null,
    },
  })
}

export async function getOrderBySessionId(sessionId: string) {
  return findOrderByUnique({
    stripeCheckoutSessionId: sessionId,
  })
}

export async function getOrderById(orderId: string) {
  return findOrderByUnique({
    id: orderId,
  })
}

export async function getOrderByAccessToken(accessToken: string) {
  return findOrderByUnique({
    accessToken,
  })
}

export async function getTicketByCode(ticketCode: string) {
  const prisma = getPrismaClient()

  return (await prisma.ticket.findUnique({
    where: {
      ticketCode,
    },
    include: {
      event: true,
      order: {
        include: withOrderIncludes(),
      },
    },
  })) as TicketWithRelations | null
}

export async function markTicketCheckedIn(ticketCode: string) {
  const prisma = getPrismaClient()
  const existingTicket = await getTicketByCode(ticketCode)

  if (!existingTicket) {
    return null
  }

  if (existingTicket.checkedInAt) {
    return existingTicket
  }

  return (await prisma.ticket.update({
    where: {
      ticketCode,
    },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
    include: {
      event: true,
      order: {
        include: withOrderIncludes(),
      },
    },
  })) as TicketWithRelations
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const prisma = getPrismaClient()
  const now = new Date()

  const [events, recentOrders, recentTickets, recentCheckIns, pendingOrders] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        orders: {
          where: {
            status: "PAID",
          },
          include: {
            tickets: true,
          },
        },
        tickets: true,
      },
    }),
    prisma.ticketOrder.findMany({
      where: {
        status: "PAID",
      },
      orderBy: {
        paidAt: "desc",
      },
      take: 12,
      include: withOrderIncludes(),
    }),
    prisma.ticket.findMany({
      orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }],
      take: 18,
      include: {
        event: true,
        order: {
          include: withOrderIncludes(),
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        checkedInAt: {
          not: null,
        },
      },
      orderBy: {
        checkedInAt: "desc",
      },
      take: 12,
      include: {
        event: true,
        order: {
          include: withOrderIncludes(),
        },
      },
    }),
    prisma.ticketOrder.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          gt: now,
        },
      },
      select: {
        quantity: true,
      },
    }),
  ])

  const typedEvents = events as Array<
    DbEventRecord & {
      orders: OrderWithEvent[]
      tickets: TicketRecord[]
    }
  >
  const allPaidOrders = typedEvents.flatMap((event) => event.orders)
  const chargedOrders = allPaidOrders.filter((order) => order.source === "CHECKOUT" && order.totalPriceCents > 0)
  const compOrders = allPaidOrders.filter((order) => order.source === "ADMIN_COMP")
  const complimentaryTickets = compOrders.reduce((total, order) => total + order.quantity, 0)
  const deliveredOrders = allPaidOrders.filter((order) => order.ticketEmailSendCount > 0)
  const allTickets = typedEvents.flatMap((event) => event.tickets)
  const totalCapacity = typedEvents.reduce((total, event) => total + event.capacity, 0)
  const totalDiscountAmountCents = allPaidOrders.reduce((total, order) => total + order.discountAmountCents, 0)
  const totalRevenueCents = typedEvents.reduce(
    (total, event) => total + event.orders.reduce((eventTotal, order) => eventTotal + order.totalPriceCents, 0),
    0,
  )
  const pendingTickets = pendingOrders.reduce((total, order) => total + order.quantity, 0)
  const salesTimelineMap = new Map<string, Required<AdminTimelinePoint>>()
  const checkInTimelineMap = new Map<string, Required<Pick<AdminTimelinePoint, "label" | "checkedInCount">>>()
  const tierPerformanceMap = new Map<string, { label: string; tickets: number; revenueCents: number }>()
  const voucherUsageMap = new Map<string, { code: string; orders: number; discountAmountCents: number }>()

  allPaidOrders.forEach((order) => {
    const tierLabel = order.ticketTierNameSnapshot || order.internalLabel || "Standard admission"
    const existingTier = tierPerformanceMap.get(tierLabel) || {
      label: tierLabel,
      tickets: 0,
      revenueCents: 0,
    }

    existingTier.tickets += order.quantity
    existingTier.revenueCents += order.totalPriceCents
    tierPerformanceMap.set(tierLabel, existingTier)

    if (order.voucherCodeSnapshot) {
      const existingVoucher = voucherUsageMap.get(order.voucherCodeSnapshot) || {
        code: order.voucherCodeSnapshot,
        orders: 0,
        discountAmountCents: 0,
      }

      existingVoucher.orders += 1
      existingVoucher.discountAmountCents += order.discountAmountCents
      voucherUsageMap.set(order.voucherCodeSnapshot, existingVoucher)
    }

    if (!order.paidAt) {
      return
    }

    const key = order.paidAt.toISOString().slice(0, 10)
    const existing = salesTimelineMap.get(key) || {
      label: buildTimelineLabel(order.paidAt),
      orders: 0,
      tickets: 0,
      revenueCents: 0,
      checkedInCount: 0,
    }

    existing.orders += 1
    existing.tickets += order.quantity
    existing.revenueCents += order.totalPriceCents
    salesTimelineMap.set(key, existing)
  })

  allTickets.forEach((ticket) => {
    if (!ticket.checkedInAt) {
      return
    }

    const key = ticket.checkedInAt.toISOString().slice(0, 10)
    const existing = checkInTimelineMap.get(key) || {
      label: buildTimelineLabel(ticket.checkedInAt),
      checkedInCount: 0,
    }

    existing.checkedInCount += 1
    checkInTimelineMap.set(key, existing)
  })

  const eventSummaries = typedEvents.map((event) => {
    const paidOrders = event.orders.length
    const ticketsIssued = event.tickets.length
    const checkedInCount = event.tickets.filter((ticket) => Boolean(ticket.checkedInAt)).length
    const revenueCents = event.orders.reduce((total, order) => total + order.totalPriceCents, 0)
    const remainingCapacity = Math.max(event.capacity - ticketsIssued, 0)

    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      capacity: event.capacity,
      paidOrders,
      ticketsIssued,
      checkedInCount,
      ticketsPendingEntry: Math.max(ticketsIssued - checkedInCount, 0),
      revenueCents,
      remainingCapacity,
      sellThroughRate: clampRate(ticketsIssued, event.capacity),
      checkInRate: clampRate(checkedInCount, ticketsIssued),
    }
  })

  const totalTicketsIssued = eventSummaries.reduce((total, event) => total + event.ticketsIssued, 0)
  const totalCheckedIn = eventSummaries.reduce((total, event) => total + event.checkedInCount, 0)
  const paidOrderCount = eventSummaries.reduce((total, event) => total + event.paidOrders, 0)
  const salesTimeline = Array.from(salesTimelineMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, point]) => point)
  const checkInTimeline = Array.from(checkInTimelineMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, point]) => ({
      label: point.label,
      checkedInCount: point.checkedInCount,
    }))

  return {
    summary: {
      paidOrders: paidOrderCount,
      compOrders: compOrders.length,
      complimentaryTickets,
      pendingOrders: pendingOrders.length,
      pendingTickets,
      deliveredOrders: deliveredOrders.length,
      ticketsIssued: totalTicketsIssued,
      checkedInCount: totalCheckedIn,
      grossRevenueCents: totalRevenueCents,
      totalCapacity,
      remainingCapacity: Math.max(totalCapacity - totalTicketsIssued, 0),
      sellThroughRate: clampRate(totalTicketsIssued, totalCapacity),
      checkInRate: clampRate(totalCheckedIn, totalTicketsIssued),
      averageOrderValueCents: chargedOrders.length > 0 ? Math.round(totalRevenueCents / chargedOrders.length) : 0,
      ticketDeliveryRate: clampRate(deliveredOrders.length, allPaidOrders.length),
      discountAmountCents: totalDiscountAmountCents,
    },
    events: eventSummaries,
    salesTimeline,
    checkInTimeline,
    recentOrders: recentOrders as OrderWithEvent[],
    recentTickets: recentTickets as TicketWithRelations[],
    recentCheckIns: recentCheckIns as TicketWithRelations[],
    topTicketTiers: Array.from(tierPerformanceMap.values())
      .sort((left, right) => right.revenueCents - left.revenueCents)
      .slice(0, 6),
    voucherUsage: Array.from(voucherUsageMap.values())
      .sort((left, right) => right.discountAmountCents - left.discountAmountCents)
      .slice(0, 6),
  }
}

export async function getAdminOrderExports() {
  const prisma = getPrismaClient()

  return (await prisma.ticketOrder.findMany({
    where: {
      status: "PAID",
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: withOrderIncludes(),
  })) as OrderWithEvent[]
}

export async function getAdminTicketExports() {
  const prisma = getPrismaClient()

  return (await prisma.ticket.findMany({
    orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }],
    include: {
      event: true,
      order: {
        include: withOrderIncludes(),
      },
    },
  })) as TicketWithRelations[]
}
