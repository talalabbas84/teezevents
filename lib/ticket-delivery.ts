import "server-only"

import { ensurePaidOrderTicketsById, getOrderByAccessToken, getOrderById } from "@/lib/checkout"
import { getTicketEmailSetupIssue, sendTicketOrderEmail } from "@/lib/ticket-email"
import { renderOrderTicketPackPdf } from "@/lib/ticket-pdf"
import { getPrismaClient } from "@/lib/prisma"

export function getTicketDeliverySetupIssue() {
  return getTicketEmailSetupIssue()
}

export async function getDeliverableOrder(orderId: string) {
  const ensuredOrder = await ensurePaidOrderTicketsById(orderId)

  if (!ensuredOrder) {
    return null
  }

  if (ensuredOrder.status !== "PAID") {
    throw new Error("Only paid or complimentary orders can issue tickets.")
  }

  return ensuredOrder
}

export async function sendTicketsForOrder({
  orderId,
  recipientEmail,
  skipIfAlreadySent = false,
}: {
  orderId: string
  recipientEmail?: string
  skipIfAlreadySent?: boolean
}) {
  const prisma = getPrismaClient()
  const order = await getDeliverableOrder(orderId)

  if (!order) {
    throw new Error("Order not found.")
  }

  const targetEmail = (recipientEmail || order.customerEmail).trim().toLowerCase()

  if (skipIfAlreadySent && order.ticketEmailSendCount > 0) {
    return {
      status: "skipped" as const,
      order,
      recipientEmail: order.ticketEmailLastSentTo || targetEmail,
    }
  }

  await sendTicketOrderEmail({
    order,
    recipientEmail: targetEmail,
  })

  const updatedOrder = await prisma.ticketOrder.update({
    where: {
      id: order.id,
    },
    data: {
      ticketEmailSendCount: {
        increment: 1,
      },
      ticketEmailLastSentAt: new Date(),
      ticketEmailLastSentTo: targetEmail,
    },
    include: {
      event: true,
      tickets: {
        orderBy: {
          ticketIndex: "asc",
        },
      },
    },
  })

  return {
    status: "sent" as const,
    order: updatedOrder,
    recipientEmail: targetEmail,
  }
}

export async function sendTicketsForEvent({
  eventId,
  skipIfAlreadySent = true,
}: {
  eventId: string
  skipIfAlreadySent?: boolean
}) {
  const prisma = getPrismaClient()
  const orders = await prisma.ticketOrder.findMany({
    where: {
      eventId,
      status: "PAID",
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
    },
  })

  const results: Array<{
    orderId: string
    orderNumber: string
    recipientEmail: string
    status: "sent" | "skipped" | "failed"
    error?: string
  }> = []

  for (const order of orders) {
    try {
      const result = await sendTicketsForOrder({
        orderId: order.id,
        skipIfAlreadySent,
      })

      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipientEmail: result.recipientEmail,
        status: result.status,
      })
    } catch (error) {
      results.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipientEmail: order.customerEmail,
        status: "failed",
        error: error instanceof Error ? error.message : "Unable to email tickets.",
      })
    }
  }

  return {
    total: orders.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  }
}

export async function getOrderTicketPack(orderId: string) {
  const order = await getDeliverableOrder(orderId)

  if (!order) {
    return null
  }

  return {
    order,
    pdfBytes: await renderOrderTicketPackPdf(order),
  }
}

export async function getOrderTicketPackByAccessToken(accessToken: string) {
  const order = await getOrderByAccessToken(accessToken)

  if (!order) {
    return null
  }

  const ensuredOrder = await ensurePaidOrderTicketsById(order.id)

  if (!ensuredOrder || ensuredOrder.status !== "PAID") {
    return null
  }

  return {
    order: ensuredOrder,
    pdfBytes: await renderOrderTicketPackPdf(ensuredOrder),
  }
}

export async function getOrderForAdmin(orderId: string) {
  return getOrderById(orderId)
}
