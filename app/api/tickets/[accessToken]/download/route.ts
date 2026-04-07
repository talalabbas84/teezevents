import { NextResponse } from "next/server"

import { getOrderTicketPackByAccessToken } from "@/lib/ticket-delivery"
import { getOrderTicketPdfFilename } from "@/lib/ticket-pdf"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accessToken: string }> },
) {
  const { accessToken } = await params
  const pack = await getOrderTicketPackByAccessToken(accessToken)

  if (!pack) {
    return NextResponse.json({ error: "Ticket pack not found." }, { status: 404 })
  }

  return new NextResponse(Buffer.from(pack.pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getOrderTicketPdfFilename(pack.order.orderNumber)}"`,
    },
  })
}
