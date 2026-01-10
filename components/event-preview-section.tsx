import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar } from "lucide-react"

const featuredEvents = [
  {
    id: "halloween-2024",
    title: "Halloween Fiesta",
    date: "October 31, 2024",
    image: "/halloween-party-decorations-with-costumes-and-ligh.jpg",
    description: "A spooky Latin celebration with DJ, costumes, and themed cocktails",
    category: "Past Event",
  },
  {
    id: "roaring-20s",
    title: "Roaring 20s Gala",
    date: "December 15, 2024",
    image: "/1920s-gatsby-style-party-elegant-art-deco.jpg",
    description: "Step back in time to the glamorous era of jazz and elegance",
    category: "Past Event",
  },
  {
    id: "summer-salsa",
    title: "Summer Salsa Night",
    date: "Coming June 2026",
    image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
    description: "Dance under the stars with live salsa band and authentic cuisine",
    category: "Upcoming Event",
  },
]

export function EventPreviewSection() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-balance">{"Our Events"}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {"From intimate gatherings to grand celebrations, explore our portfolio of unforgettable experiences"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="group">
              <Card className="overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-xl">
                <div className="relative overflow-hidden aspect-[3/2]">
                  <img
                    src={event.image || "/placeholder.svg"}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      {event.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
            </Link>
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
