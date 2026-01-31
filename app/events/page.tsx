import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, MapPin, Users } from "lucide-react"

const allEvents = [
  {
    id: "halloween-2024",
    title: "Halloween Fiesta",
    date: "October 31, 2024",
    location: "Downtown Event Center",
    attendees: "500+",
    image: "/halloween-party-decorations-with-costumes-and-ligh.jpg",
    description: "A spooky Latin celebration with DJ, costumes, and themed cocktails",
    category: "Past Event",
    type: "themed",
  },
  {
    id: "roaring-20s",
    title: "Roaring 20s Gala",
    date: "December 15, 2024",
    location: "Grand Ballroom",
    attendees: "350+",
    image: "/1920s-gatsby-style-party-elegant-art-deco.jpg",
    description: "Step back in time to the glamorous era of jazz and elegance",
    category: "Past Event",
    type: "themed",
  },
  {
    id: "summer-salsa",
    title: "Summer Salsa Night",
    date: "Coming June 2026",
    location: "Outdoor Pavilion",
    attendees: "400+",
    image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
    description: "Dance under the stars with live salsa band and authentic cuisine",
    category: "Upcoming Event",
    type: "latin",
  },
  {
    id: "corporate-gala",
    title: "Corporate Anniversary Gala",
    date: "September 20, 2024",
    location: "Luxury Hotel",
    attendees: "250+",
    image: "/corporate-event-elegant-ballroom-setup.jpg",
    description: "An elegant corporate celebration with Latin-inspired entertainment",
    category: "Past Event",
    type: "corporate",
  },
  {
    id: "new-years-bash",
    title: "New Year's Latin Bash",
    date: "December 31, 2025",
    location: "City Center Plaza",
    attendees: "800+",
    image: "/new-years-party-fireworks-celebration.jpg",
    description: "Ring in the new year with live Latin music, dancing, and fireworks",
    category: "Past Event",
    type: "latin",
  },
  {
    id: "spring-carnival",
    title: "Spring Carnival",
    date: "Coming April 2026",
    location: "Riverside Park",
    attendees: "600+",
    image: "/colorful-carnival-celebration-with-decorations.jpg",
    description: "A vibrant carnival celebration with food, games, and live entertainment",
    category: "Upcoming Event",
    type: "latin",
  },
]

export default function EventsPage() {
  const pastEvents = allEvents.filter((e) => e.category === "Past Event")
  const upcomingEvents = allEvents.filter((e) => e.category === "Upcoming Event")

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
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className={`group animate-fade-in-up stagger-${index + 1}`}
                >
                  <Card className="overflow-hidden border-3 hover-lift h-full transition-all duration-500 bg-white shadow-xl">
                    <div className="relative overflow-hidden aspect-[4/3]">
                      <img
                        src={event.image || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125 group-hover:rotate-3"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <CardContent className="p-10">
                      <h3
                        className="text-3xl md:text-4xl font-serif font-bold mb-6 group-hover:text-gradient transition-all duration-300"
                        style={{ color: "#B86A2E" }}
                      >
                        {event.title}
                      </h3>
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <Calendar size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.date}</span>
                        </div>
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <MapPin size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-4 text-lg" style={{ color: "#2B2B2B" }}>
                          <Users size={20} style={{ color: "#D88C4A" }} />
                          <span className="font-semibold">{event.attendees} Expected</span>
                        </div>
                      </div>
                      <p className="leading-relaxed text-xl" style={{ color: "#6B4423" }}>
                        {event.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
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
                          <span className="font-semibold">{event.date}</span>
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
                        {event.description}
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
