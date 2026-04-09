import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock3, MapPin, QrCode, Ticket } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { formatCurrency, syncOrderPaymentStatusFromCheckoutSession } from "@/lib/checkout"
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

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const order = sessionId ? await syncOrderPaymentStatusFromCheckoutSession(sessionId).catch(() => null) : null
  const event = order ? await getPublicEventById(order.eventId).catch(() => null) : null
  const eventDate = order ? formatEventDate(order.eventDateSnapshot, order.event.startsAt) : null
  const eventTime = order ? formatEventTime(event?.time, order.event.startsAt) : null
  const qrCodeEntries = order
    ? await Promise.all(
        order.tickets.map(async (ticket) => ({
          ticketId: ticket.id,
          qrCodeSrc: await getTicketQrCodeDataUrl(ticket.ticketCode),
        })),
      )
    : []
  const qrCodeByTicketId = new Map(qrCodeEntries.map((entry) => [entry.ticketId, entry.qrCodeSrc]))

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-xl lg:p-12">
              <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-primary" />
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {"Payment Confirmed"}
              </div>
              <h1 className="mb-4 text-4xl font-serif font-bold text-balance">{"Your tickets are secured."}</h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                {"Stripe has confirmed your checkout. Your order now issues a QR ticket for each guest so entry can be managed directly from the TEEZ dashboard."}
              </p>

              {order && (
                <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/10 p-6 text-left">
                  <div className="mb-4 flex items-center gap-3 text-primary">
                    <Ticket size={18} />
                    <div className="font-semibold">{order.eventTitleSnapshot}</div>
                  </div>
                  <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div>{`Order: ${order.orderNumber}`}</div>
                    <div>{`Tickets: ${order.quantity}`}</div>
                    <div>{`Total: ${formatCurrency(order.totalPriceCents, order.currency)}`}</div>
                    <div>{`Email: ${order.customerEmail}`}</div>
                    {order.ticketTierNameSnapshot && <div>{`Tier: ${order.ticketTierNameSnapshot}`}</div>}
                    {order.voucherCodeSnapshot && (
                      <div>{`Voucher: ${order.voucherCodeSnapshot} (-${formatCurrency(order.discountAmountCents, order.currency)})`}</div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {order.tickets.length > 0
                      ? `${order.tickets.length} ticket QR code(s) are ready.`
                      : "Ticket issuance is still syncing. Refresh this page if your wallet is not ready yet."}
                  </div>
                </div>
              )}

              {order && order.tickets.length > 0 && (
                <div className="mb-8 rounded-2xl border border-border bg-background p-6 text-left">
                  <div className="mb-4 flex items-center gap-3 text-primary">
                    <QrCode size={18} />
                    <div className="font-semibold">Your entry QR codes</div>
                  </div>
                  <div className="mb-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-primary" />
                      <span>{eventDate}</span>
                    </div>
                    {eventTime && (
                      <div className="flex items-center gap-2">
                        <Clock3 size={16} className="text-primary" />
                        <span>{eventTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-primary" />
                      <span>{event?.location || "Downtown Toronto"}</span>
                    </div>
                    <div className="text-muted-foreground">Exact venue details are shared after confirmation.</div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {order.tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                              Ticket {ticket.ticketIndex}
                            </div>
                            <div className="mt-1 font-medium">{ticket.holderName}</div>
                          </div>
                          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {ticket.ticketCode}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-primary/15 bg-white p-3">
                          <img
                            src={qrCodeByTicketId.get(ticket.id) || ""}
                            alt={`QR code for ${ticket.ticketCode}`}
                            className="mx-auto h-44 w-44"
                          />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Present this QR code at entry, or open the full wallet for all ticket actions.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-4">
                {order?.accessToken && (
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                    <Link href={`/tickets/${order.accessToken}`}>{"Open Ticket Wallet"}</Link>
                  </Button>
                )}
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href={order ? `/events/${order.eventId}` : "/events"}>{"Back to Event"}</Link>
                </Button>
                <Button asChild variant="outline" className="border-2 border-primary text-primary">
                  <Link href="/events">{"Browse More Events"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
