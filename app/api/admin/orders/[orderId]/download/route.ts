import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getOrderTicketPack } from "@/lib/ticket-delivery"
import { getOrderTicketPdfFilename } from "@/lib/ticket-pdf"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const { orderId } = await params
  const pack = await getOrderTicketPack(orderId)

  if (!pack) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  return new NextResponse(Buffer.from(pack.pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getOrderTicketPdfFilename(pack.order.orderNumber)}"`,
    },
  })
}
