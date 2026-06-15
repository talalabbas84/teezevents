import Link from "next/link"
import { Archive, Calendar, MapPin, Music, Ticket } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const summerPulseTicketHref = "/checkout/summer-pulse"

const archiveEvents = [
  {
    title: "The Roaring 20s Winter Holiday Ball",
    date: "December 2025",
    vibe:
      "A completely sold-out, high-energy take on classic elegance. Dressed-to-the-nines crowd, a packed floor, and a midnight countdown.",
    href: "/events/roaring-20s",
    image: "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904276/teez-events/roaring20s/Punta_Cana-134_besxou.jpg",
  },
  {
    title: "The Blossom Party",
    date: "April 2026",
    vibe: "Our exclusive, invite-only VVIP gathering. High hospitality, deep curation, and pure insider energy.",
    href: "/events/blossom",
    image: "/vibrant-dance-party-with-colorful-lights.jpg",
  },
  {
    title: "The Inaugural Halloween Party",
    date: "October 2025",
    vibe:
      "The legendary night that started it all. Massive turnout, heavy dance floor energy, and the birth of the Teez vision.",
    href: "/events/halloween-2024",
    image:
      "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904526/teez-events/HAlloween/fa265eb2-2191-4aa1-857a-ec49a564a46f.png",
  },
]

export default function EventsPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <section className="py-20 lg:py-28" style={{ backgroundColor: "#EADFCB" }}>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">{"NEXT UP"}</div>
              <h1 className="mt-4 text-5xl font-serif font-bold text-gradient md:text-7xl">{"Summer Pulse"}</h1>
            </div>

            <Card className="overflow-hidden border-2 border-primary/20 bg-white shadow-xl">
              <div className="grid lg:grid-cols-[1fr_1.05fr]">
                <div className="relative min-h-[360px]">
                  <img
                    src="/outdoor-salsa-dancing-party-summer-evening.jpg"
                    alt="Summer Pulse party"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-8 lg:p-12">
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{"Featured Event"}</div>
                  <h2 className="mt-3 text-4xl font-serif font-bold md:text-5xl">{"Summer Pulse"}</h2>
                  <div className="mt-7 grid gap-4 text-lg text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-primary" />
                      <span>{"Saturday, August 15, 2026"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={20} className="text-primary" />
                      <span>{"Toronto, ON"}</span>
                    </div>
                  </div>
                  <p className="mt-7 text-xl leading-relaxed text-muted-foreground">
                    {
                      "The ultimate mid-summer fusion party. Sandwiching a heavy Latin vibe of reggaeton, salsa, and bachata between house, hip-hop, and global Afrobeats."
                    }
                  </p>
                  <Button className="mt-9 bg-primary text-primary-foreground hover:bg-accent" size="lg" asChild>
                    <Link href={summerPulseTicketHref}>
                      <Ticket className="mr-2" size={20} />
                      {"Get Tickets Now"}
                    </Link>
                  </Button>
                </CardContent>
              </div>
            </Card>
          </div>
        </section>

        <section className="bg-[#1C2431] py-20 text-white lg:py-28">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10 flex items-center gap-3">
              <Archive className="text-[#D88C4A]" size={26} />
              <h2 className="text-4xl font-serif font-bold md:text-5xl">{"PAST SEGMENTS (The Archive)"}</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {archiveEvents.map((event) => (
                <Card key={event.title} className="overflow-hidden border-white/10 bg-white/10 text-white shadow-xl">
                  <div className="relative aspect-[4/3]">
                    <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <CardContent className="p-6">
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#D88C4A]">{event.date}</div>
                    <h3 className="mt-3 text-2xl font-serif font-bold">{event.title}</h3>
                    <div className="mt-5 flex items-start gap-3 text-white/78">
                      <Music className="mt-1 shrink-0 text-[#D88C4A]" size={18} />
                      <p className="leading-relaxed">{event.vibe}</p>
                    </div>
                    <Button variant="outline" className="mt-6 border-white/40 bg-transparent text-white hover:bg-white/20" asChild>
                      <Link href={event.href}>{"View Gallery"}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
