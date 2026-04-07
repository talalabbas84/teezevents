import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { buildCsv } from "@/lib/csv"
import { getAdminTicketExports } from "@/lib/checkout"
import { getPublicTicketUrl, getPublicTicketWalletUrl } from "@/lib/ticket-qr"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const tickets = await getAdminTicketExports()
  const csv = buildCsv([
    [
      "ticket_code",
      "event_id",
      "event_title",
      "order_number",
      "source",
      "label",
      "ticket_tier",
      "voucher_code",
      "holder_name",
      "holder_email",
      "ticket_status",
      "checked_in_at",
      "buyer_name",
      "buyer_email",
      "paid_at",
      "ticket_url",
      "wallet_url",
      "created_at",
    ],
    ...tickets.map((ticket) => [
      ticket.ticketCode,
      ticket.eventId,
      ticket.order.eventTitleSnapshot,
      ticket.order.orderNumber,
      ticket.order.source,
      ticket.order.internalLabel,
      ticket.order.ticketTierNameSnapshot,
      ticket.order.voucherCodeSnapshot,
      ticket.holderName,
      ticket.holderEmail,
      ticket.status,
      ticket.checkedInAt?.toISOString() || "",
      ticket.order.customerName,
      ticket.order.customerEmail,
      ticket.order.paidAt?.toISOString() || "",
      getPublicTicketUrl(ticket.ticketCode),
      ticket.order.accessToken ? getPublicTicketWalletUrl(ticket.order.accessToken) : "",
      ticket.createdAt.toISOString(),
    ]),
  ])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="teez-ticket-attendees.csv"',
    },
  })
}
