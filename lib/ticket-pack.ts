import "server-only"

import { eventsById } from "@/lib/events"
import { getPublicTicketUrl, getPublicTicketWalletUrl, getTicketQrCodeDataUrl } from "@/lib/ticket-qr"

type TicketPackOrder = {
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
  internalLabel?: string | null
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

function formatCurrency(amountInCents: number, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

function formatEventDate(order: TicketPackOrder) {
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

function formatEventTime(order: TicketPackOrder) {
  if (order.event.startsAt) {
    return order.event.startsAt.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return eventsById[order.eventId]?.time || null
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function getOrderTicketPackFilename(orderNumber: string) {
  return `teez-tickets-${orderNumber.toLowerCase()}.html`
}

export async function renderOrderTicketPackHtml(order: TicketPackOrder) {
  const event = eventsById[order.eventId]
  const eventTime = formatEventTime(order)
  const eventDate = formatEventDate(order)
  const venue = event
    ? event.venue?.trim() || "Location shared after confirmation"
    : order.event.venue?.trim() || "Location shared after confirmation"
  const location = event ? event.location : order.event.address || ""
  const walletUrl = order.accessToken ? getPublicTicketWalletUrl(order.accessToken) : null
  const ticketCards = await Promise.all(
    order.tickets.map(async (ticket) => {
      const qrCodeSrc = await getTicketQrCodeDataUrl(ticket.ticketCode)
      const ticketUrl = getPublicTicketUrl(ticket.ticketCode)

      return `
        <section class="ticket-card">
          <div class="ticket-main">
            <div class="eyebrow">Digital Ticket</div>
            <h2>${escapeHtml(order.eventTitleSnapshot)}</h2>
            <div class="meta-grid">
              <div><span>Date</span><strong>${escapeHtml(eventDate)}</strong></div>
              <div><span>Time</span><strong>${escapeHtml(eventTime || "See event details")}</strong></div>
              <div><span>Holder</span><strong>${escapeHtml(ticket.holderName)}</strong></div>
              <div><span>Email</span><strong>${escapeHtml(ticket.holderEmail)}</strong></div>
              <div><span>Order</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
              <div><span>Ticket</span><strong>${ticket.ticketIndex} of ${order.quantity}</strong></div>
              <div><span>Code</span><strong class="mono">${escapeHtml(ticket.ticketCode)}</strong></div>
              <div><span>Status</span><strong>${ticket.checkedInAt ? "Checked In" : "Valid"}</strong></div>
            </div>
            <div class="venue-block">
              <div class="venue">${escapeHtml(venue)}</div>
              <div class="location">${escapeHtml(location || "Toronto")}</div>
            </div>
            <div class="links">
              <a href="${ticketUrl}">${escapeHtml(ticketUrl)}</a>
            </div>
          </div>
          <div class="ticket-qr">
            <img src="${qrCodeSrc}" alt="QR code for ${escapeHtml(ticket.ticketCode)}" />
            <p>Scan at entry</p>
          </div>
        </section>
      `
    }),
  )

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>TEEZ Tickets ${escapeHtml(order.orderNumber)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f7eddb;
        --panel: #fffaf2;
        --ink: #2b2b2b;
        --muted: #6d5f51;
        --accent: #c57a3a;
        --line: rgba(197, 122, 58, 0.22);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
        background: radial-gradient(circle at top right, rgba(216, 140, 74, 0.18), transparent 35%), var(--bg);
        color: var(--ink);
      }
      .wrap {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 48px;
      }
      .hero, .ticket-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 28px 80px rgba(69, 43, 17, 0.08);
      }
      .hero {
        padding: 28px;
        margin-bottom: 24px;
      }
      .eyebrow {
        display: inline-block;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent);
      }
      h1, h2 {
        font-family: Georgia, "Times New Roman", serif;
        margin: 12px 0;
      }
      h1 { font-size: 44px; }
      h2 { font-size: 32px; }
      .hero-grid, .meta-grid {
        display: grid;
        gap: 16px;
      }
      .hero-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-top: 20px;
      }
      .hero-grid span, .meta-grid span {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .ticket-card {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) 280px;
        overflow: hidden;
        margin-top: 20px;
      }
      .ticket-main {
        padding: 28px;
      }
      .ticket-qr {
        border-left: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(197, 122, 58, 0.08), rgba(197, 122, 58, 0.16));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 28px;
        text-align: center;
      }
      .ticket-qr img {
        width: 220px;
        height: 220px;
      }
      .meta-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin: 20px 0;
      }
      .venue-block {
        padding: 18px 20px;
        border-radius: 22px;
        background: rgba(197, 122, 58, 0.08);
      }
      .venue {
        font-weight: 700;
        margin-bottom: 6px;
      }
      .links {
        margin-top: 16px;
        font-size: 14px;
      }
      .links a {
        color: var(--accent);
        word-break: break-all;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .footer-note {
        margin-top: 24px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.6;
      }
      @media print {
        body { background: white; }
        .wrap { width: 100%; padding: 0; }
        .hero, .ticket-card { box-shadow: none; }
      }
      @media (max-width: 840px) {
        .ticket-card {
          grid-template-columns: 1fr;
        }
        .ticket-qr {
          border-left: 0;
          border-top: 1px solid var(--line);
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <div class="eyebrow">TEEZ Ticket Pack</div>
        <h1>${escapeHtml(order.eventTitleSnapshot)}</h1>
        <p>Order ${escapeHtml(order.orderNumber)} for ${escapeHtml(order.customerName)}.</p>
        <div class="hero-grid">
          <div><span>Date</span><strong>${escapeHtml(eventDate)}</strong></div>
          <div><span>Time</span><strong>${escapeHtml(eventTime || "See event details")}</strong></div>
          <div><span>Venue</span><strong>${escapeHtml(venue)}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(location || "Toronto")}</strong></div>
          <div><span>Tickets</span><strong>${order.quantity}</strong></div>
          <div><span>Total</span><strong>${escapeHtml(formatCurrency(order.totalPriceCents, order.currency))}</strong></div>
          <div><span>Source</span><strong>${escapeHtml(order.source === "ADMIN_COMP" ? "Admin complimentary" : "Paid checkout")}</strong></div>
          <div><span>Label</span><strong>${escapeHtml(order.internalLabel || "Standard")}</strong></div>
        </div>
        ${
          walletUrl
            ? `<div class="footer-note">
          Wallet link: <a href="${walletUrl}">${escapeHtml(walletUrl)}</a>
        </div>`
            : ""
        }
      </section>
      ${ticketCards.join("")}
      <p class="footer-note">
        Present one QR code per guest at entry. Tickets remain linked to the live TEEZ admin dashboard for verification and check-in.
      </p>
    </main>
  </body>
</html>`
}
