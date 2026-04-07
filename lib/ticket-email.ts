import "server-only"

import nodemailer from "nodemailer"

import { getOrderTicketPdfFilename, renderOrderTicketPackPdf } from "@/lib/ticket-pdf"
import { getPublicTicketUrl, getPublicTicketWalletUrl } from "@/lib/ticket-qr"

type TicketEmailOrder = {
  id: string
  orderNumber: string
  accessToken: string | null
  eventId: string
  eventTitleSnapshot: string
  eventDateSnapshot: string | null
  customerName: string
  customerEmail: string
  currency: string
  totalPriceCents: number
  discountAmountCents?: number
  quantity: number
  internalLabel?: string | null
  ticketTierNameSnapshot?: string | null
  voucherCodeSnapshot?: string | null
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

function getEmailConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || "587")
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const fromEmail = process.env.SMTP_FROM_EMAIL
  const fromName = process.env.SMTP_FROM_NAME || "TEEZ Events"

  if (!host || !port || !fromEmail) {
    throw new Error("Missing SMTP_HOST, SMTP_PORT, or SMTP_FROM_EMAIL.")
  }

  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName,
  }
}

function formatEventDate(order: TicketEmailOrder) {
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function getTicketEmailSetupIssue() {
  try {
    getEmailConfig()
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Ticket email delivery is not configured."
  }
}

function createTransport() {
  const config = getEmailConfig()

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  })
}

function buildTicketEmailHtml(order: TicketEmailOrder, recipientEmail: string) {
  const walletUrl = order.accessToken ? getPublicTicketWalletUrl(order.accessToken) : null
  const ticketLinks = order.tickets
    .map(
      (ticket) =>
        `<li><a href="${getPublicTicketUrl(ticket.ticketCode)}">${escapeHtml(ticket.ticketCode)}</a> for ${escapeHtml(ticket.holderName)}</li>`,
    )
    .join("")

  return `
    <div style="font-family: Helvetica Neue, Arial, sans-serif; background: #f7eddb; padding: 32px 16px; color: #2b2b2b;">
      <div style="max-width: 720px; margin: 0 auto; background: #fffaf2; border: 1px solid rgba(197,122,58,0.22); border-radius: 24px; overflow: hidden;">
        <div style="padding: 32px; background: linear-gradient(135deg, rgba(197,122,58,0.12), rgba(46,107,91,0.08));">
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #c57a3a;">TEEZ Tickets</div>
          <h1 style="font-family: Georgia, serif; font-size: 40px; margin: 12px 0 0;">${escapeHtml(order.eventTitleSnapshot)}</h1>
          <p style="margin: 12px 0 0; color: #6d5f51; line-height: 1.6;">
            ${escapeHtml(order.customerName)}, your ticket wallet is ready. This email was prepared for ${escapeHtml(recipientEmail)}.
          </p>
        </div>
        <div style="padding: 32px;">
          <div style="display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 24px;">
            <div><div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6d5f51;">Order</div><div style="margin-top: 6px; font-weight: 600;">${escapeHtml(order.orderNumber)}</div></div>
            <div><div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6d5f51;">Date</div><div style="margin-top: 6px; font-weight: 600;">${escapeHtml(formatEventDate(order))}</div></div>
            <div><div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6d5f51;">Tickets</div><div style="margin-top: 6px; font-weight: 600;">${order.quantity}</div></div>
            <div><div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6d5f51;">Type</div><div style="margin-top: 6px; font-weight: 600;">${escapeHtml(order.ticketTierNameSnapshot || order.internalLabel || "Standard admission")}</div></div>
          </div>
          ${
            order.voucherCodeSnapshot
              ? `<p style="margin: 0 0 16px; line-height: 1.7; color: #6d5f51;">
            Voucher applied: <strong>${escapeHtml(order.voucherCodeSnapshot)}</strong>${order.discountAmountCents ? ` • Saved ${escapeHtml(new Intl.NumberFormat("en-CA", { style: "currency", currency: order.currency.toUpperCase(), maximumFractionDigits: 2 }).format(order.discountAmountCents / 100))}` : ""}
          </p>`
              : ""
          }
          ${
            walletUrl
              ? `<p style="margin: 0 0 16px; line-height: 1.7;">
            Open your digital wallet here:
            <a href="${walletUrl}" style="color: #c57a3a;">${escapeHtml(walletUrl)}</a>
          </p>`
              : ""
          }
          <ul style="padding-left: 18px; line-height: 1.8; margin: 0 0 20px;">
            ${ticketLinks}
          </ul>
          <p style="margin: 0 0 20px; line-height: 1.7; color: #6d5f51;">
            A printable ticket pack is attached to this email. Present one QR code per guest at entry.
          </p>
        </div>
      </div>
    </div>
  `
}

export async function sendTicketOrderEmail({
  order,
  recipientEmail,
}: {
  order: TicketEmailOrder
  recipientEmail: string
}) {
  const config = getEmailConfig()
  const transport = createTransport()
  const packPdf = await renderOrderTicketPackPdf(order)

  await transport.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: recipientEmail,
    subject: `${order.eventTitleSnapshot} Tickets • ${order.orderNumber}`,
    html: buildTicketEmailHtml(order, recipientEmail),
    attachments: [
      {
        filename: getOrderTicketPdfFilename(order.orderNumber),
        content: Buffer.from(packPdf),
        contentType: "application/pdf",
      },
    ],
  })
}
