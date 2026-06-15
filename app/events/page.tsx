import Link from "next/link"
import { Archive, Calendar, CreditCard, MapPin, Music, Ticket } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getEventPrimaryTicketHref,
  getEventPrimaryTicketLabel,
  supportsCheckout,
} from "@/lib/events"
import { listPublicEvents } from "@/lib/public-events"

export default async function EventsPage() {
  const events = await listPublicEvents()
  const upcomingEvents = events.filter((event) => event.category === "Upcoming Event")
  const pastEvents = events.filter((event) => event.category === "Past Event")
  const featuredEvent = upcomingEvents.find((event) => event.featured) || upcomingEvents[0] || null
  const featuredTicketHref = featuredEvent ? getEventPrimaryTicketHref(featuredEvent) : null
  const featuredTicketLabel = featuredEvent ? getEventPrimaryTicketLabel(featuredEvent) : null

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <section className="py-20 lg:py-28" style={{ backgroundColor: "#EADFCB" }}>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">{"NEXT UP"}</div>
              <h1 className="mt-4 text-5xl font-serif font-bold text-gradient md:text-7xl">
                {featuredEvent ? featuredEvent.title : "Events"}
              </h1>
            </div>

            {featuredEvent ? (
              <Card className="overflow-hidden border-2 border-primary/20 bg-white shadow-xl">
                <div className="grid lg:grid-cols-[1fr_1.05fr]">
                  <div className="relative min-h-[360px]">
                    <img
                      src={featuredEvent.image || "/placeholder.svg"}
                      alt={featuredEvent.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-8 lg:p-12">
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                      {featuredEvent.featured ? "Featured Event" : "Upcoming Event"}
                    </div>
                    <h2 className="mt-3 text-4xl font-serif font-bold md:text-5xl">{featuredEvent.title}</h2>
                    <div className="mt-7 grid gap-4 text-lg text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-primary" />
                        <span>{featuredEvent.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin size={20} className="text-primary" />
                        <span>
                          {featuredEvent.venue
                            ? `${featuredEvent.venue} - ${featuredEvent.location}`
                            : featuredEvent.location}
                        </span>
                      </div>
                    </div>
                    <p className="mt-7 text-xl leading-relaxed text-muted-foreground">
                      {featuredEvent.previewDescription}
                    </p>
                    <div className="mt-9 flex flex-wrap gap-3">
                      <Button className="bg-primary text-primary-foreground hover:bg-accent" size="lg" asChild>
                        <Link href={`/events/${featuredEvent.id}`}>
                          <Calendar className="mr-2" size={20} />
                          {"Event Details"}
                        </Link>
                      </Button>
                      {featuredTicketHref && featuredTicketLabel && (
                        <Button variant="outline" className="border-2 border-primary text-primary" size="lg" asChild>
                          <Link href={featuredTicketHref}>
                            {supportsCheckout(featuredEvent) ? (
                              <CreditCard className="mr-2" size={20} />
                            ) : (
                              <Ticket className="mr-2" size={20} />
                            )}
                            {featuredTicketLabel}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ) : (
              <Card className="border-2 border-primary/20 bg-white shadow-xl">
                <CardContent className="p-8 lg:p-12">
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{"No Published Events"}</div>
                  <h2 className="mt-3 text-4xl font-serif font-bold md:text-5xl">{"Nothing is live yet"}</h2>
                  <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {"Create an event in the admin dashboard, switch on Show publicly, and mark it Featured to place it here."}
                  </p>
                  <Button className="mt-8 bg-primary text-primary-foreground hover:bg-accent" size="lg" asChild>
                    <Link href="/admin/events">{"Open Event Studio"}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="bg-[#1C2431] py-20 text-white lg:py-28">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10 flex items-center gap-3">
              <Archive className="text-[#D88C4A]" size={26} />
              <h2 className="text-4xl font-serif font-bold md:text-5xl">{"PAST SEGMENTS (The Archive)"}</h2>
            </div>

            {pastEvents.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {pastEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden border-white/10 bg-white/10 text-white shadow-xl">
                    <div className="relative aspect-[4/3]">
                      <img
                        src={event.image || "/placeholder.svg"}
                        alt={event.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#D88C4A]">
                        {event.shortDate}
                      </div>
                      <h3 className="mt-3 text-2xl font-serif font-bold">{event.title}</h3>
                      <div className="mt-5 flex items-start gap-3 text-white/78">
                        <Music className="mt-1 shrink-0 text-[#D88C4A]" size={18} />
                        <p className="leading-relaxed">{event.previewDescription}</p>
                      </div>
                      <Button variant="outline" className="mt-6 border-white/40 bg-transparent text-white hover:bg-white/20" asChild>
                        <Link href={`/events/${event.id}`}>{"View Gallery"}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/10 p-8 text-white/78">
                {"Past events will appear here after they are published from the admin dashboard."}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
