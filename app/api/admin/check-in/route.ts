import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getTicketByCode, markTicketCheckedIn, normalizeTicketCodeInput } from "@/lib/checkout"

const checkInSchema = z.object({
  ticketCode: z.string().trim().min(1),
  eventId: z.string().trim().min(1).optional(),
  mode: z.enum(["lookup", "checkin"]).default("checkin"),
})

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = checkInSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticket scan request." }, { status: 400 })
  }

  const normalizedCode = normalizeTicketCodeInput(parsed.data.ticketCode)

  if (!normalizedCode) {
    return NextResponse.json({ error: "Missing ticket code." }, { status: 400 })
  }

  const existingTicket = await getTicketByCode(normalizedCode)

  if (!existingTicket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
  }

  if (parsed.data.eventId && existingTicket.eventId !== parsed.data.eventId) {
    return NextResponse.json({ error: "This ticket belongs to a different event." }, { status: 400 })
  }

  if (parsed.data.mode === "checkin" && existingTicket.order.status !== "PAID") {
    return NextResponse.json({ error: `This order is ${existingTicket.order.status.toLowerCase()} and cannot be checked in.` }, { status: 400 })
  }

  const alreadyCheckedIn = Boolean(existingTicket.checkedInAt)
  const ticket =
    parsed.data.mode === "checkin" ? (await markTicketCheckedIn(normalizedCode)) || existingTicket : existingTicket

  return NextResponse.json({
    ok: true,
    alreadyCheckedIn,
    message:
      parsed.data.mode === "lookup"
        ? "Ticket located."
        : alreadyCheckedIn
          ? "Ticket was already checked in."
          : "Ticket checked in successfully.",
    ticket: {
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null,
      holderName: ticket.holderName,
      holderEmail: ticket.holderEmail,
      ticketIndex: ticket.ticketIndex,
      totalTickets: ticket.order.quantity,
      eventId: ticket.eventId,
      eventTitle: ticket.order.eventTitleSnapshot,
      eventDate: ticket.order.eventDateSnapshot,
      orderNumber: ticket.order.orderNumber,
      ticketHref: `/tickets/code/${ticket.ticketCode}`,
      walletHref: ticket.order.accessToken ? `/tickets/${ticket.order.accessToken}` : null,
    },
  })
}
