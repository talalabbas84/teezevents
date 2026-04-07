import type { ReactNode } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Clock, CreditCard, MapPin, Ticket, Users } from "lucide-react"
import {
  getEventPrimaryTicketHref,
  getEventPrimaryTicketLabel,
  supportsCheckout,
} from "@/lib/events"
import { getFeaturedPublicEvents } from "@/lib/public-events"

function TicketButton({
  href,
  label,
  icon,
  variant = "outline",
}: {
  href: string
  label: string
  icon: ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      className={
        variant === "default"
          ? "bg-primary text-primary-foreground hover:bg-accent"
          : "border-2 border-primary text-primary"
      }
      asChild
    >
      <Link href={href}>
        {icon}
        {label}
      </Link>
    </Button>
  )
}

export async function EventPreviewSection() {
  const featuredUpcomingEvents = await getFeaturedPublicEvents()

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-balance">
            {"Get Your Tickets for the Next Events"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {"Reserve your spot early and head straight to checkout when tickets are live."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {featuredUpcomingEvents.map((event) => {
            const ticketHref = getEventPrimaryTicketHref(event)
            const ticketLabel = getEventPrimaryTicketLabel(event)

            return (
              <Card
                key={event.id}
                className="group overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-xl"
              >
                <Link href={`/events/${event.id}`} className="block">
                  <div className="relative overflow-hidden aspect-[3/2]">
                    <img
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {event.ticketPrice && (
                      <div className="absolute left-4 top-4 rounded-full bg-black/65 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                        {event.ticketPrice}
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-6">
                  <Link href={`/events/${event.id}`} className="block">
                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>{event.shortDate}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span>{event.time}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>{event.location}</span>
                      </div>
                      {event.spotsLeft !== undefined && event.capacity !== undefined && (
                        <div className="flex items-center gap-2">
                          <Users size={16} />
                          <span>
                            {event.spotsLeft}/{event.capacity} spots left
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">{event.previewDescription}</p>
                    <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                      {"View Details"}
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" asChild>
                      <Link href={`/events/${event.id}`}>
                        <ArrowRight className="mr-2" size={16} />
                        {"Event Details"}
                      </Link>
                    </Button>
                    <TicketButton
                      href={ticketHref}
                      label={ticketLabel}
                      icon={
                        supportsCheckout(event) ? (
                          <CreditCard className="mr-2" size={16} />
                        ) : (
                          <Ticket className="mr-2" size={16} />
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
            asChild
          >
            <Link href="/events">
              {"View All Events"}
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
