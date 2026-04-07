import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { buildCsv } from "@/lib/csv"
import { getAdminOrderExports } from "@/lib/checkout"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const orders = await getAdminOrderExports()
  const csv = buildCsv([
    [
      "order_number",
      "event_id",
      "event_title",
      "source",
      "label",
      "ticket_tier",
      "voucher_code",
      "status",
      "customer_name",
      "customer_email",
      "customer_phone",
      "quantity",
      "unit_price_cad",
      "discount_cad",
      "total_price_cad",
      "currency",
      "paid_at",
      "email_send_count",
      "last_ticket_email_to",
      "last_ticket_email_at",
      "issued_by_admin_email",
      "notes",
      "created_at",
    ],
    ...orders.map((order) => [
      order.orderNumber,
      order.eventId,
      order.eventTitleSnapshot,
      order.source,
      order.internalLabel,
      order.ticketTierNameSnapshot,
      order.voucherCodeSnapshot,
      order.status,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.quantity,
      (order.unitPriceCents / 100).toFixed(2),
      (order.discountAmountCents / 100).toFixed(2),
      (order.totalPriceCents / 100).toFixed(2),
      order.currency.toUpperCase(),
      order.paidAt?.toISOString() || "",
      order.ticketEmailSendCount,
      order.ticketEmailLastSentTo,
      order.ticketEmailLastSentAt?.toISOString() || "",
      order.issuedByAdminEmail,
      order.notes,
      order.createdAt.toISOString(),
    ]),
  ])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="teez-orders-export.csv"',
    },
  })
}
