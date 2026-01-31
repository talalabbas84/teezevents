import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Ticket } from "lucide-react"

const upcomingEvents = [
  {
    id: "summer-salsa",
    title: "Summer Salsa Night",
    date: "Coming June 2026",
    image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
    description: "Dance under the stars with live salsa band and chef-crafted cuisine",
    ticketsUrl: "/contact",
  },
  {
    id: "spring-carnival",
    title: "Spring Carnival",
    date: "Coming April 2026",
    image: "/colorful-carnival-celebration-with-decorations.jpg",
    description: "A vibrant carnival celebration with food, games, and live entertainment",
    ticketsUrl: "/contact",
  },
]

export function EventPreviewSection() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-balance">{"Upcoming Events"}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {"Reserve your spot at our upcoming celebrations and view event details."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
          {upcomingEvents.map((event) => (
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
                </div>
              </Link>
              <CardContent className="p-6">
                <Link href={`/events/${event.id}`} className="block">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar size={16} />
                    <span>{event.date}</span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{event.description}</p>
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
                  <Button size="sm" variant="outline" className="border-2 border-primary text-primary" asChild>
                    <Link href={event.ticketsUrl}>
                      <Ticket className="mr-2" size={16} />
                      {"Buy Tickets"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
