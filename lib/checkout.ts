import "server-only"

import { eventsById, supportsCheckout } from "@/lib/events"
import { getPrismaClient } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe-server"

const ORDER_HOLD_MINUTES = 30

type DbEventRecord = {
  id: string
  title: string
  startsAt: Date | null
  venue: string | null
  address: string | null
  currency: string
  ticketPriceCents: number
  capacity: number
  isActive: boolean
}

type TicketOrderRecord = {
  id: string
  orderNumber: string
  eventId: string
  eventTitleSnapshot: string
  eventDateSnapshot: string | null
  customerEmail: string
  quantity: number
  totalPriceCents: number
  currency: string
  expiresAt: Date | null
}

type OrderWithEvent = TicketOrderRecord & {
  event: DbEventRecord
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function buildDbEventData(eventId: string): DbEventRecord {
  const event = eventsById[eventId]

  if (!event || !supportsCheckout(event) || !event.ticketPriceCents || !event.currency || !event.capacity) {
    throw new Error("This event is not available for checkout.")
  }

  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAtIso ? new Date(event.startsAtIso) : null,
    venue: event.venue || null,
    address: event.address || event.location,
    currency: event.currency.toLowerCase(),
    ticketPriceCents: event.ticketPriceCents,
    capacity: event.capacity,
    isActive: true,
  }
}

export function getCheckoutEvent(eventId: string) {
  const event = eventsById[eventId]

  if (!event || !supportsCheckout(event) || !event.ticketPriceCents || !event.currency || !event.capacity) {
    return null
  }

  return event
}

export function formatCurrency(amountInCents: number, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

type CheckoutSetupIssue = {
  title: string
  description: string
  action?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function getCheckoutSetupIssue(error: unknown): CheckoutSetupIssue {
  const message = getErrorMessage(error)

  if (/does not exist in the current database|The table `public\./i.test(message)) {
    return {
      title: "Checkout database tables are missing.",
      description: "Stripe and Postgres are configured, but Prisma has not created the Event and TicketOrder tables in your database yet.",
      action: 'Run "pnpm db:push" and then "pnpm db:seed".',
    }
  }

  if (/Prisma client is not installed/i.test(message)) {
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
    description: "The event page is ready for secure card checkout, but the database or Stripe configuration has not been completed yet.",
    action: "Use the manual RSVP path for now, or finish the Postgres and Stripe setup and come back here.",
  }
}

async function getReservedTicketCount(eventId: string) {
  const prisma = getPrismaClient()
  const now = new Date()
  const aggregate = await prisma.ticketOrder.aggregate({
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
  })

  return aggregate._sum.quantity ?? 0
}

export async function syncCheckoutEventRecord(eventId: string) {
  const prisma = getPrismaClient()
  const data = buildDbEventData(eventId)

  return (await prisma.event.upsert({
    where: { id: data.id },
    update: {
      title: data.title,
      startsAt: data.startsAt,
      venue: data.venue,
      address: data.address,
      currency: data.currency,
      ticketPriceCents: data.ticketPriceCents,
      capacity: data.capacity,
      isActive: data.isActive,
    },
    create: data,
  })) as unknown as DbEventRecord
}

export async function getEventInventorySnapshot(eventId: string) {
  const event = getCheckoutEvent(eventId)

  if (!event || !event.capacity) {
    return null
  }

  const dbEvent = await syncCheckoutEventRecord(eventId)
  const reserved = await getReservedTicketCount(dbEvent.id)

  return {
    reserved,
    available: Math.max(dbEvent.capacity - reserved, 0),
    capacity: dbEvent.capacity,
    unitPriceCents: dbEvent.ticketPriceCents,
    currency: dbEvent.currency,
  }
}

function buildOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = crypto.randomUUID().split("-")[0].toUpperCase()

  return `TEEZ-${stamp}-${suffix}`
}

type CheckoutRequest = {
  eventId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  quantity: number
  notes?: string
  baseUrl: string
}

type CreatedOrder = {
  event: DbEventRecord
  order: TicketOrderRecord
}

export async function createStripeCheckoutForOrder(input: CheckoutRequest) {
  const prisma = getPrismaClient()
  const checkoutEvent = getCheckoutEvent(input.eventId)

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
          startsAt: buildDbEventData(checkoutEvent.id).startsAt,
          venue: checkoutEvent.venue || null,
          address: checkoutEvent.address || checkoutEvent.location,
          currency: checkoutEvent.currency.toLowerCase(),
          ticketPriceCents: checkoutEvent.ticketPriceCents,
          capacity: checkoutEvent.capacity,
          isActive: true,
        },
        create: buildDbEventData(checkoutEvent.id),
      })) as unknown as DbEventRecord

      const activeReservations = await tx.ticketOrder.aggregate({
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
      })

      const reservedCount = activeReservations._sum.quantity ?? 0
      const remaining = Math.max(event.capacity - reservedCount, 0)

      if (remaining < input.quantity) {
        throw new Error(remaining > 0 ? `Only ${remaining} ticket(s) remain for this event.` : "This event is sold out.")
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
          unitPriceCents: event.ticketPriceCents,
          totalPriceCents: event.ticketPriceCents * input.quantity,
          currency: event.currency,
          notes: input.notes || null,
          expiresAt: addMinutes(now, ORDER_HOLD_MINUTES),
        },
      })) as unknown as TicketOrderRecord

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
        eventId: checkoutEvent.id,
      },
      line_items: [
        {
          quantity: input.quantity,
          price_data: {
            currency: createdOrder.event.currency,
            unit_amount: createdOrder.event.ticketPriceCents,
            product_data: {
              name: checkoutEvent.title,
              description: `${checkoutEvent.shortDate}${checkoutEvent.time ? ` at ${checkoutEvent.time}` : ""}`,
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

export async function markOrderPaidFromCheckoutSession(sessionId: string, paymentIntentId?: string | null) {
  const prisma = getPrismaClient()

  return prisma.ticketOrder.update({
    where: {
      stripeCheckoutSessionId: sessionId,
    },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId || null,
      expiresAt: null,
    },
  })
}

export async function markOrderExpiredFromCheckoutSession(sessionId: string) {
  const prisma = getPrismaClient()

  return prisma.ticketOrder.update({
    where: {
      stripeCheckoutSessionId: sessionId,
    },
    data: {
      status: "EXPIRED",
    },
  })
}

export async function getOrderBySessionId(sessionId: string) {
  const prisma = getPrismaClient()

  return (await prisma.ticketOrder.findUnique({
    where: {
      stripeCheckoutSessionId: sessionId,
    },
    include: {
      event: true,
    },
  })) as OrderWithEvent | null
}
