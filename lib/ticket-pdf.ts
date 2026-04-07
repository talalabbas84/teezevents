import "server-only"

import { StandardFonts, rgb, PDFDocument } from "pdf-lib"

import { eventsById } from "@/lib/events"
import { getPublicTicketUrl, getPublicTicketWalletUrl, getTicketQrCodeDataUrl } from "@/lib/ticket-qr"

type TicketPdfOrder = {
  orderNumber: string
  accessToken: string | null
  eventId: string
  eventTitleSnapshot: string
  eventDateSnapshot: string | null
  customerName: string
  customerEmail: string
  quantity: number
  currency: string
  totalPriceCents: number
  discountAmountCents?: number
  internalLabel?: string | null
  ticketTierNameSnapshot?: string | null
  voucherCodeSnapshot?: string | null
  source?: string
  event: {
    startsAt: Date | null
    venue: string | null
    address: string | null
  }
  tickets: Array<{
    id: string
    ticketCode: string
    holderName: string
    holderEmail: string
    ticketIndex: number
    checkedInAt: Date | null
  }>
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_X = 40
const PRIMARY = rgb(0.773, 0.478, 0.227)
const INK = rgb(0.169, 0.169, 0.169)
const MUTED = rgb(0.427, 0.373, 0.318)
const PANEL = rgb(1, 0.98, 0.95)
const BACKGROUND = rgb(0.969, 0.929, 0.859)
const BORDER = rgb(0.89, 0.78, 0.67)

function formatCurrency(amountInCents: number, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

function formatEventDate(order: TicketPdfOrder) {
  if (order.eventDateSnapshot) {
    return order.eventDateSnapshot
  }

  if (!order.event.startsAt) {
    return "Date to be announced"
  }

  return order.event.startsAt.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatEventTime(order: TicketPdfOrder) {
  if (order.event.startsAt) {
    return order.event.startsAt.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return eventsById[order.eventId]?.time || null
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",")
  return Uint8Array.from(Buffer.from(base64, "base64"))
}

function fitText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`
}

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function drawLabelValue({
  page,
  label,
  value,
  x,
  y,
  width,
  labelFont,
  bodyFont,
}: {
  page: any
  label: string
  value: string
  x: number
  y: number
  width: number
  labelFont: any
  bodyFont: any
}) {
  page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 9,
    font: labelFont,
    color: MUTED,
  })

  const valueLines = wrapText(value, width, bodyFont, 12)
  let lineY = y - 16

  valueLines.slice(0, 3).forEach((line) => {
    page.drawText(line, {
      x,
      y: lineY,
      size: 12,
      font: bodyFont,
      color: INK,
    })
    lineY -= 15
  })
}

export function getOrderTicketPdfFilename(orderNumber: string) {
  return `teez-tickets-${orderNumber.toLowerCase()}.pdf`
}

export async function renderOrderTicketPackPdf(order: TicketPdfOrder) {
  const pdf = await PDFDocument.create()
  const serifFont = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica)
  const bodyBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const walletUrl = order.accessToken ? getPublicTicketWalletUrl(order.accessToken) : null
  const event = eventsById[order.eventId]
  const eventDate = formatEventDate(order)
  const eventTime = formatEventTime(order) || "See event details"
  const venue = event?.venue || order.event.venue || "Venue to be announced"
  const location = event?.location || order.event.address || "Toronto"

  const summaryPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  summaryPage.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: BACKGROUND,
  })
  summaryPage.drawRectangle({
    x: MARGIN_X,
    y: 120,
    width: PAGE_WIDTH - MARGIN_X * 2,
    height: 640,
    color: PANEL,
    borderColor: BORDER,
    borderWidth: 1,
  })
  summaryPage.drawText("TEEZ Ticket Pack", {
    x: MARGIN_X + 24,
    y: 730,
    size: 12,
    font: bodyBold,
    color: PRIMARY,
  })
  summaryPage.drawText(fitText(order.eventTitleSnapshot, 44), {
    x: MARGIN_X + 24,
    y: 690,
    size: 28,
    font: serifFont,
    color: INK,
  })
  summaryPage.drawText(`Order ${order.orderNumber}`, {
    x: MARGIN_X + 24,
    y: 658,
    size: 13,
    font: bodyFont,
    color: MUTED,
  })

  drawLabelValue({
    page: summaryPage,
    label: "Date",
    value: eventDate,
    x: MARGIN_X + 24,
    y: 610,
    width: 210,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Time",
    value: eventTime,
    x: MARGIN_X + 260,
    y: 610,
    width: 120,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Venue",
    value: venue,
    x: MARGIN_X + 24,
    y: 540,
    width: 210,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Location",
    value: location,
    x: MARGIN_X + 260,
    y: 540,
    width: 250,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Purchaser",
    value: `${order.customerName}\n${order.customerEmail}`,
    x: MARGIN_X + 24,
    y: 470,
    width: 210,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Tickets",
    value: String(order.quantity),
    x: MARGIN_X + 260,
    y: 470,
    width: 80,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Total",
    value: formatCurrency(order.totalPriceCents, order.currency),
    x: MARGIN_X + 360,
    y: 470,
    width: 150,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Type",
    value:
      order.ticketTierNameSnapshot ||
      order.internalLabel ||
      (order.source === "ADMIN_COMP" ? "Complimentary" : "Standard admission"),
    x: MARGIN_X + 24,
    y: 400,
    width: 210,
    labelFont: bodyBold,
    bodyFont,
  })
  drawLabelValue({
    page: summaryPage,
    label: "Source",
    value: order.source === "ADMIN_COMP" ? "Admin complimentary" : "Paid checkout",
    x: MARGIN_X + 260,
    y: 400,
    width: 250,
    labelFont: bodyBold,
    bodyFont,
  })
  if (order.voucherCodeSnapshot) {
    drawLabelValue({
      page: summaryPage,
      label: "Voucher",
      value: `${order.voucherCodeSnapshot}${order.discountAmountCents ? ` • Saved ${formatCurrency(order.discountAmountCents, order.currency)}` : ""}`,
      x: MARGIN_X + 24,
      y: 330,
      width: 486,
      labelFont: bodyBold,
      bodyFont,
    })
  }

  const summaryText = walletUrl
    ? `This PDF includes one entry page per guest. Your digital wallet remains available at ${walletUrl}.`
    : "This PDF includes one entry page per guest. Present one QR code per guest at entry."
  wrapText(summaryText, PAGE_WIDTH - MARGIN_X * 2 - 48, bodyFont, 11).forEach((line, index) => {
    summaryPage.drawText(line, {
      x: MARGIN_X + 24,
      y: 300 - index * 15,
      size: 11,
      font: bodyFont,
      color: MUTED,
    })
  })

  for (const ticket of order.tickets) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: BACKGROUND,
    })
    page.drawRectangle({
      x: MARGIN_X,
      y: 120,
      width: PAGE_WIDTH - MARGIN_X * 2,
      height: 640,
      color: PANEL,
      borderColor: BORDER,
      borderWidth: 1,
    })

    page.drawText("Digital Entry Ticket", {
      x: MARGIN_X + 24,
      y: 730,
      size: 12,
      font: bodyBold,
      color: PRIMARY,
    })
    page.drawText(fitText(order.eventTitleSnapshot, 44), {
      x: MARGIN_X + 24,
      y: 692,
      size: 26,
      font: serifFont,
      color: INK,
    })

    const qrDataUrl = await getTicketQrCodeDataUrl(ticket.ticketCode)
    const qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl))
    page.drawImage(qrImage, {
      x: PAGE_WIDTH - MARGIN_X - 200,
      y: 470,
      width: 160,
      height: 160,
    })

    drawLabelValue({
      page,
      label: "Date",
      value: eventDate,
      x: MARGIN_X + 24,
      y: 620,
      width: 210,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Time",
      value: eventTime,
      x: MARGIN_X + 24,
      y: 550,
      width: 210,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Venue",
      value: venue,
      x: MARGIN_X + 24,
      y: 480,
      width: 210,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Location",
      value: location,
      x: MARGIN_X + 24,
      y: 410,
      width: 210,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Holder",
      value: ticket.holderName,
      x: MARGIN_X + 24,
      y: 340,
      width: 210,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Email",
      value: ticket.holderEmail,
      x: MARGIN_X + 24,
      y: 270,
      width: 230,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Order",
      value: order.orderNumber,
      x: MARGIN_X + 285,
      y: 430,
      width: 150,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Ticket",
      value: `${ticket.ticketIndex} of ${order.quantity}`,
      x: MARGIN_X + 285,
      y: 360,
      width: 150,
      labelFont: bodyBold,
      bodyFont,
    })
    drawLabelValue({
      page,
      label: "Status",
      value: ticket.checkedInAt ? "Checked In" : "Valid for entry",
      x: MARGIN_X + 285,
      y: 290,
      width: 150,
      labelFont: bodyBold,
      bodyFont,
    })

    page.drawText("Ticket Code", {
      x: MARGIN_X + 24,
      y: 178,
      size: 9,
      font: bodyBold,
      color: MUTED,
    })
    page.drawText(ticket.ticketCode, {
      x: MARGIN_X + 24,
      y: 158,
      size: 14,
      font: bodyBold,
      color: INK,
    })

    const publicTicketUrl = getPublicTicketUrl(ticket.ticketCode)
    wrapText(publicTicketUrl, PAGE_WIDTH - MARGIN_X * 2 - 48, bodyFont, 9).slice(0, 2).forEach((line, index) => {
      page.drawText(line, {
        x: MARGIN_X + 24,
        y: 120 - index * 12,
        size: 9,
        font: bodyFont,
        color: MUTED,
      })
    })
  }

  return pdf.save()
}
