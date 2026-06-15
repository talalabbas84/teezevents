import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  DoorOpen,
  Music,
  Sparkles,
  Ticket,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { HeroCarousel } from "@/components/hero-carousel"
import { Navigation } from "@/components/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Button } from "@/components/ui/button"
import { roaring20sGallery } from "@/lib/events"

const eventPlanningHref =
  "mailto:info@teezevents.ca?subject=Plan%20an%20event%20with%20Teez%20Events%20Co."
const summerPulseTicketHref = "/checkout/summer-pulse"

const operatingFeatures = [
  {
    icon: Sparkles,
    title: "Creative Direction",
    body: "Turning a blank room into a fully realized theme and an unforgettable atmosphere.",
  },
  {
    icon: Music,
    title: "Full-Scale Production",
    body: "Complete venue curation, heavy-hitting sound, and flawless management from start to finish.",
  },
  {
    icon: DoorOpen,
    title: "Airtight Operations",
    body: "From smooth digital ticketing to high-energy hospitality and professional door management.",
  },
]

export default async function HomePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-20">
        <HeroCarousel />

        <section className="bg-background py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal>
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Teez Events Management</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold leading-tight text-balance md:text-5xl">
                    We build events that feel alive before the first guest even walks in.
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Teez handles the entire blueprint from concept to door. Whether you&apos;re booking us to curate a space or
                  collaborating on a massive night, we bring the execution and the crowd.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {operatingFeatures.map((feature, index) => {
                const Icon = feature.icon

                return (
                  <ScrollReveal key={feature.title} delay={index * 80} className="h-full">
                    <article className="h-full rounded-lg border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                      <Icon className="text-primary" size={26} />
                      <h3 className="mt-5 text-xl font-serif font-bold">{feature.title}</h3>
                      <p className="mt-3 leading-relaxed text-muted-foreground">{feature.body}</p>
                    </article>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#1C2431] py-16 text-white lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <ScrollReveal>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#D88C4A]">Featured Case Study</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold leading-tight text-balance md:text-5xl">
                    Roaring 20s Gala: theme, glamour, and a room full of movement.
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed text-white/75">
                    The strongest event themes are easy to understand and exciting to join. Roaring 20s gave guests a
                    reason to dress up, meet people, take photos, and stay on the floor.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      ["350+", "Guests"],
                      ["9", "Gallery moments"],
                      ["5.0", "Room energy"],
                    ].map(([value, label]) => (
                      <div key={label} className="border-l border-white/20 pl-4">
                        <div className="text-3xl font-serif font-bold">{value}</div>
                        <div className="mt-1 text-sm text-white/70">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-9 flex flex-wrap gap-3">
                    <Button className="bg-[#D88C4A] text-[#1C2431] hover:bg-primary" asChild>
                      <Link href="/events/roaring-20s">
                        {"Open Roaring 20s Gallery"}
                        <ArrowRight className="ml-2" size={18} />
                      </Link>
                    </Button>
                    <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
                      <Link href={eventPlanningHref}>{"Plan a themed night"}</Link>
                    </Button>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={120}>
                <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px]">
                  {roaring20sGallery.slice(0, 5).map((image, index) => (
                    <figure
                      key={image}
                      className={`overflow-hidden rounded-lg border border-white/10 bg-white/5 ${
                        index === 0 ? "col-span-2 row-span-2" : ""
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Roaring 20s event preview ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    </figure>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal>
              <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">What&apos;s Next</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold text-balance md:text-5xl">Featured Event</h2>
                </div>
                <article className="overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="relative min-h-[320px]">
                      <img
                        src="/outdoor-salsa-dancing-party-summer-evening.jpg"
                        alt="Summer Pulse dance floor"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-8 lg:p-10">
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Featured Event</div>
                      <h3 className="mt-3 text-4xl font-serif font-bold text-balance md:text-5xl">Summer Pulse</h3>
                      <div className="mt-6 space-y-4 text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <Calendar className="text-primary" size={20} />
                          <span className="font-semibold text-foreground">Saturday, August 15, 2026</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Music className="mt-0.5 text-primary" size={20} />
                          <span>The ultimate mid-summer fusion party.</span>
                        </div>
                      </div>
                      <Button className="mt-8 bg-primary text-primary-foreground hover:bg-accent" asChild>
                        <Link href={summerPulseTicketHref}>
                          <Ticket className="mr-2" size={18} />
                          {"Get Tickets Now"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* <TestimonialsSection /> */}

        <section className="bg-[#1C2431] py-16 text-white lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal>
              <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-block">
                    <div className="relative h-20 w-20">
                      <Image
                        src="/images/screenshot-202026-01-10-20at-2012.png"
                        alt="Teez Events Co."
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <h2 className="text-4xl font-serif font-bold text-balance md:text-6xl">Make the next room impossible to forget.</h2>
                  <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/75">
                    Bring us the occasion. We’ll help shape the concept, guest experience, ticketing, visuals, and
                    day-of execution into one cohesive event.
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/10 p-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D88C4A]">Start Here</div>
                  <div className="mt-5 space-y-3">
                    <Button className="w-full bg-[#D88C4A] text-[#1C2431] hover:bg-primary" asChild>
                      <Link href={eventPlanningHref}>{"Plan an Event"}</Link>
                    </Button>
                    <Button variant="outline" className="w-full border-white/40 bg-transparent text-white hover:bg-white/20" asChild>
                      <Link href="/events">{"Browse the Portfolio"}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
