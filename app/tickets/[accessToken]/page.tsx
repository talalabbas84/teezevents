import Link from "next/link"
import { notFound } from "next/navigation"
import { Clock3, Download, Ticket } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TicketPass } from "@/components/ticket-pass"
import { Button } from "@/components/ui/button"
import { getOrderByAccessToken, formatCurrency } from "@/lib/checkout"
import { getPublicEventById } from "@/lib/public-events"
import { getTicketQrCodeDataUrl } from "@/lib/ticket-qr"

function formatEventDate(dateLabel: string | null, startsAt: Date | null) {
  if (dateLabel) {
    return dateLabel
  }

  if (!startsAt) {
    return "Date to be announced"
  }

  return startsAt.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatEventTime(fallbackTime: string | undefined, startsAt: Date | null) {
  if (startsAt) {
    return startsAt.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return fallbackTime || null
}

export default async function TicketWalletPage({ params }: { params: Promise<{ accessToken: string }> }) {
  const { accessToken } = await params
  const order = await getOrderByAccessToken(accessToken)

  if (!order) {
    notFound()
  }

  const event = await getPublicEventById(order.eventId)
  const eventDate = formatEventDate(order.eventDateSnapshot, order.event.startsAt)
  const eventTime = formatEventTime(event?.time, order.event.startsAt)
  const qrCodeEntries = await Promise.all(
    order.tickets.map(async (ticket) => ({
      ticketId: ticket.id,
      qrCodeSrc: await getTicketQrCodeDataUrl(ticket.ticketCode),
    })),
  )
  const qrCodeByTicketId = new Map(qrCodeEntries.map((entry) => [entry.ticketId, entry.qrCodeSrc]))

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="relative overflow-hidden py-20 lg:py-24" style={{ backgroundColor: "#EADFCB" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,140,74,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(184,106,46,0.18),transparent_35%)]" />
          <div className="container relative mx-auto px-4 lg:px-8">
            <div className="mb-10 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm">
                <Ticket size={16} />
                Your TEEZ Tickets
              </div>
              <h1 className="mb-4 text-5xl font-serif font-bold text-balance">Ticket Wallet</h1>
              <p className="text-lg text-muted-foreground">
                {order.status === "PAID"
                  ? "These are the issued tickets for your order. Save the link and present one QR code per guest at entry."
                  : "Your order exists, but the payment confirmation has not finished syncing yet. Refresh shortly if your tickets are still being issued."}
              </p>
            </div>

            <div className="mb-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl lg:p-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Order Number</div>
                  <div className="mt-2 font-medium">{order.orderNumber}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Purchaser</div>
                  <div className="mt-2 font-medium">{order.customerName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tickets</div>
                  <div className="mt-2 font-medium">{`${order.tickets.length}/${order.quantity} issued`}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Total Paid</div>
                  <div className="mt-2 font-medium">{formatCurrency(order.totalPriceCents, order.currency)}</div>
                </div>
              </div>

              {(order.ticketTierNameSnapshot || order.voucherCodeSnapshot) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {order.ticketTierNameSnapshot && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ticket Tier</div>
                      <div className="mt-2 font-medium">{order.ticketTierNameSnapshot}</div>
                    </div>
                  )}
                  {order.voucherCodeSnapshot && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Voucher Applied</div>
                      <div className="mt-2 font-medium">
                        {`${order.voucherCodeSnapshot} • Saved ${formatCurrency(order.discountAmountCents, order.currency)}`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {order.status === "PAID" && order.tickets.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                    <a href={`/api/tickets/${accessToken}/download`}>
                      <Download className="mr-2" size={16} />
                      Download Tickets
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {order.status !== "PAID" || order.tickets.length === 0 ? (
              <div className="rounded-[2rem] border border-border bg-card p-8 shadow-xl">
                <div className="flex items-start gap-4">
                  <Clock3 className="mt-1 text-primary" />
                  <div className="space-y-4">
                    <h2 className="text-3xl font-serif font-bold">Tickets Are Still Being Issued</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Payment went through Stripe, but your ticket wallet has not been finalized yet. This usually
                      resolves within a few seconds once the payment webhook or success page sync completes.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                        <Link href={`/checkout/${order.eventId}`}>Back to Event Checkout</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-2 border-primary text-primary">
                        <Link href={`/events/${order.eventId}`}>Back to Event</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {order.tickets.map((ticket) => (
                  <TicketPass
                    key={ticket.id}
                    eventTitle={order.eventTitleSnapshot}
                    eventDate={eventDate}
                    eventTime={eventTime}
                    venue={event?.venue || order.event.venue}
                    location={event?.location || order.event.address}
                    holderName={ticket.holderName}
                    orderNumber={order.orderNumber}
                    ticketCode={ticket.ticketCode}
                    ticketIndex={ticket.ticketIndex}
                    totalTickets={order.quantity}
                    qrCodeSrc={qrCodeByTicketId.get(ticket.id) || ""}
                    ticketHref={`/tickets/code/${ticket.ticketCode}`}
                    checkedInAt={ticket.checkedInAt}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
