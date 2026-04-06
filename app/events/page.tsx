import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, CreditCard, MapPin, Ticket, Users } from "lucide-react"
import { allEvents, getEventPrimaryTicketHref, getEventPrimaryTicketLabel, supportsCheckout } from "@/lib/events"

export default function EventsPage() {
  const pastEvents = allEvents.filter((event) => event.category === "Past Event")
  const upcomingEvents = allEvents.filter((event) => event.category === "Upcoming Event")

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <section className="py-24 lg:py-40" style={{ backgroundColor: "#EADFCB" }}>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-20 text-center">
              <h2 className="text-6xl md:text-7xl font-serif font-bold mb-6 text-gradient animate-fade-in">
                {"Upcoming Events"}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {upcomingEvents.map((event, index) => (
                <Card
                  key={event.id}
                  className={`group overflow-hidden border-3 hover-lift h-full transition-all duration-500 bg-white shadow-xl animate-fade-in-up stagger-${index + 1}`}
                >
                  <Link href={`/events/${event.id}`} className="block">
                    <div className="relative overflow-hidden aspect-[4/3]">
                      <img
                        src={event.image || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125 group-hover:rotate-3"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {event.ticketPrice && (
                        <div className="absolute left-6 top-6 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                          {event.ticketPrice}
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="flex h-full flex-col p-10">
                    <Link href={`/events/${event.id}`} className="block">
                      <h3
                        className="text-3xl md:text-4xl font-serif font-bold mb-6 group-hover:text-gradient transition-all duration-300"
                        style={{ color: "#B86A2E" }}
                      >
                        {event.title}
                      </h3>
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <Calendar size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.shortDate}</span>
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                            <Clock size={20} style={{ color: "#D88C4A" }} />
                            <span className="font-semibold">{event.time}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <MapPin size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <Users size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">
                            {event.spotsLeft !== undefined && event.capacity !== undefined
                              ? `${event.spotsLeft}/${event.capacity} spots left`
                              : `${event.attendees} Expected`}
                          </span>
                        </div>
                      </div>
                      <p className="leading-relaxed text-xl" style={{ color: "#6B4423" }}>
                        {event.previewDescription}
                      </p>
                    </Link>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" asChild>
                        <Link href={`/events/${event.id}`}>{"Event Details"}</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="border-2 border-primary text-primary" asChild>
                        <Link href={getEventPrimaryTicketHref(event)}>
                          {supportsCheckout(event) ? (
                            <CreditCard className="mr-2" size={16} />
                          ) : (
                            <Ticket className="mr-2" size={16} />
                          )}
                          {getEventPrimaryTicketLabel(event)}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-40 dark-section">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-20 text-center">
              <h2
                className="text-6xl md:text-7xl font-serif font-bold mb-6 animate-fade-in"
                style={{ color: "#EADFCB" }}
              >
                {"Past Events"}
              </h2>
              <p className="text-2xl animate-fade-in stagger-1" style={{ color: "#EADFCB" }}>
                {"Relive the magic of our previous celebrations"}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
              {pastEvents.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className={`group animate-fade-in-up stagger-${index + 1}`}
                >
                  <Card className="overflow-hidden border-3 hover-lift h-full transition-all duration-500 glass-dark shadow-2xl">
                    <div className="relative overflow-hidden aspect-[4/3]">
                      <img
                        src={event.image || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125 group-hover:rotate-3"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-6 right-6">
                        <span
                          className="inline-block px-5 py-3 text-white text-base font-bold rounded-full shadow-xl"
                          style={{ backgroundColor: "#C57A3A" }}
                        >
                          {"Ended"}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-10">
                      <h3
                        className="text-3xl md:text-4xl font-serif font-bold mb-6 transition-all duration-300"
                        style={{ color: "#D88C4A" }}
                      >
                        {event.title}
                      </h3>
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#EADFCB" }}>
                          <Calendar size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.shortDate}</span>
                        </div>
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#EADFCB" }}>
                          <MapPin size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#EADFCB" }}>
                          <Users size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.attendees} Attendees</span>
                        </div>
                      </div>
                      <p className="leading-relaxed text-xl" style={{ color: "#EADFCB" }}>
                        {event.previewDescription}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
