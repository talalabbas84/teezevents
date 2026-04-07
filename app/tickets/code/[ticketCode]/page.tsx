import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, ShieldCheck, Ticket } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TicketPass } from "@/components/ticket-pass"
import { Button } from "@/components/ui/button"
import { getTicketByCode } from "@/lib/checkout"
import { isAdminAuthenticated } from "@/lib/admin-auth"
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

export default async function TicketCodePage({ params }: { params: Promise<{ ticketCode: string }> }) {
  const { ticketCode } = await params
  const ticket = await getTicketByCode(ticketCode)

  if (!ticket) {
    notFound()
  }

  const event = await getPublicEventById(ticket.eventId)
  const eventDate = formatEventDate(ticket.order.eventDateSnapshot, ticket.event.startsAt)
  const eventTime = formatEventTime(event?.time, ticket.event.startsAt)
  const qrCodeSrc = await getTicketQrCodeDataUrl(ticket.ticketCode)
  const adminAuthenticated = await isAdminAuthenticated().catch(() => false)

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
                Entry Ticket
              </div>
              <h1 className="mb-4 text-5xl font-serif font-bold text-balance">{ticket.order.eventTitleSnapshot}</h1>
              <p className="text-lg text-muted-foreground">
                Scan this ticket at the door. The code below is tied to a paid TEEZ order and can be verified in the
                admin dashboard.
              </p>
            </div>

            <TicketPass
              eventTitle={ticket.order.eventTitleSnapshot}
              eventDate={eventDate}
              eventTime={eventTime}
              venue={event?.venue || ticket.event.venue}
              location={event?.location || ticket.event.address}
              holderName={ticket.holderName}
              orderNumber={ticket.order.orderNumber}
              ticketCode={ticket.ticketCode}
              ticketIndex={ticket.ticketIndex}
              totalTickets={ticket.order.quantity}
              qrCodeSrc={qrCodeSrc}
              ticketHref={`/tickets/code/${ticket.ticketCode}`}
              checkedInAt={ticket.checkedInAt}
              adminCheckInAction={adminAuthenticated ? `/api/admin/tickets/${ticket.ticketCode}/check-in` : undefined}
              adminRedirectTo={`/tickets/code/${ticket.ticketCode}`}
            />

            <div className="mt-8 flex flex-wrap gap-3">
              {ticket.order.accessToken && (
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href={`/tickets/${ticket.order.accessToken}`}>Open Full Ticket Wallet</Link>
                </Button>
              )}
              {ticket.order.accessToken && (
                <Button asChild variant="outline" className="border-2 border-primary text-primary">
                  <a href={`/api/tickets/${ticket.order.accessToken}/download`}>
                    <Download className="mr-2" size={16} />
                    Download Tickets
                  </a>
                </Button>
              )}
              {!adminAuthenticated && (
                <Button asChild variant="outline" className="border-2 border-primary text-primary">
                  <Link href="/admin/login">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck size={16} />
                      Admin Sign In
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
