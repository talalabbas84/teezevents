import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, Clock, MapPin, ShieldCheck, Ticket } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { CheckoutForm } from "@/components/checkout-form"
import { getCheckoutSetupIssue, getEventInventorySnapshot } from "@/lib/checkout"
import { eventsById, supportsCheckout } from "@/lib/events"

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = eventsById[id]

  if (!event || !supportsCheckout(event) || !event.ticketPriceCents || !event.currency || !event.capacity) {
    notFound()
  }

  let inventory: Awaited<ReturnType<typeof getEventInventorySnapshot>> = null
  let checkoutUnavailable = false
  let setupIssue = null

  try {
    inventory = await getEventInventorySnapshot(id)
  } catch (error) {
    checkoutUnavailable = true
    setupIssue = getCheckoutSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="relative overflow-hidden py-20 lg:py-24" style={{ backgroundColor: "#EADFCB" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,140,74,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(184,106,46,0.18),transparent_35%)]" />
          <div className="container relative mx-auto px-4 lg:px-8">
            <div className="mb-12 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm">
                <ShieldCheck size={16} />
                {"Secure Stripe Checkout"}
              </div>
              <h1 className="mb-4 text-5xl font-serif font-bold text-balance">{`Buy Tickets for ${event.title}`}</h1>
              <p className="text-lg text-muted-foreground">
                {"Complete the form below to reserve your spot. You’ll be redirected to Stripe to finish payment securely."}
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-lg lg:p-8">
                {inventory && !checkoutUnavailable ? (
                  <CheckoutForm
                    eventId={event.id}
                    eventTitle={event.title}
                    ticketPriceCents={event.ticketPriceCents}
                    currency={event.currency}
                    availableTickets={inventory.available}
                    maxTicketsPerOrder={event.maxTicketsPerOrder}
                  />
                ) : (
                  <div className="space-y-5">
                    <h2 className="text-3xl font-serif font-bold">
                      {setupIssue?.title || "Checkout is temporarily unavailable."}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {setupIssue?.description ||
                        "The event page is ready for secure card checkout, but the database or Stripe configuration has not been completed yet."}
                    </p>
                    {setupIssue?.action && <p className="text-muted-foreground leading-relaxed">{setupIssue.action}</p>}
                    {event.ticketsUrl && (
                      <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                        <Link href={event.ticketsUrl}>{"Use Manual RSVP Instead"}</Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-lg">
                  <img src={event.image} alt={event.title} className="h-64 w-full object-cover" />
                  <div className="space-y-5 p-6">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{"Order Summary"}</div>
                      <h2 className="text-3xl font-serif font-bold">{event.title}</h2>
                      <p className="text-muted-foreground">{event.previewDescription}</p>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-primary" />
                        <span>{event.shortDate}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-primary" />
                          <span>{event.time}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-primary" />
                        <span>{event.venue ? `${event.venue} • ${event.location}` : event.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Ticket size={16} className="text-primary" />
                        <span>
                          {inventory
                            ? `${inventory.available}/${inventory.capacity} spots currently available`
                            : `${event.spotsLeft ?? event.capacity}/${event.capacity} spots currently available`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-primary/20 bg-primary/10 p-6">
                  <h3 className="mb-3 text-xl font-serif font-bold">{"Before You Pay"}</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>{"Card payments are handled in Stripe and ticket holds expire automatically if checkout is not completed."}</p>
                    <p>{"Invite-only events still require respectful conduct and a positive vibe throughout the night."}</p>
                    <p>{event.kindNote || "Tickets are subject to venue capacity."}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
