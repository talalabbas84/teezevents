import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  CreditCard,
  DoorOpen,
  MapPinned,
  Music,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import { EventPreviewSection } from "@/components/event-preview-section"
import { Footer } from "@/components/footer"
import { HeroCarousel } from "@/components/hero-carousel"
import { Navigation } from "@/components/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Button } from "@/components/ui/button"
import { roaring20sGallery } from "@/lib/events"

const operatingFeatures = [
  {
    icon: Sparkles,
    title: "Creative direction",
    body: "A clear concept, mood, dress code, photo language, and room flow before production starts.",
  },
  {
    icon: ClipboardList,
    title: "Full planning stack",
    body: "Venue scouting, vendors, schedules, staffing, guest communications, and day-of run sheets.",
  },
  {
    icon: CreditCard,
    title: "Ticketed experiences",
    body: "Checkout, vouchers, guest lists, attendee exports, and QR ticket delivery built into the event.",
  },
  {
    icon: DoorOpen,
    title: "Door operations",
    body: "Live check-in, ticket validation, comp lists, and admin tools for fast entry and clean reporting.",
  },
]

const servicePillars = [
  "Theme development",
  "Vendor coordination",
  "Ticketing and payments",
  "Guest communication",
  "Run-of-show planning",
  "Check-in operations",
  "Photography direction",
  "Post-event recap",
]

const productionSteps = [
  {
    title: "Concept",
    body: "We shape the event around a feeling guests can understand quickly and participate in naturally.",
  },
  {
    title: "Build",
    body: "Vendors, logistics, ticketing, visuals, staffing, and timing are assembled into one operating plan.",
  },
  {
    title: "Host",
    body: "The event runs with clear ownership at the door, in the room, and behind the scenes.",
  },
  {
    title: "Replay",
    body: "Photos, learnings, exports, and guest momentum become reusable assets for the next event.",
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
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">TEEZ Event Management</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold leading-tight text-balance md:text-5xl">
                    We design events that feel alive before the first guest walks in.
                  </h2>
                </div>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  TEEZ brings together creative direction, production planning, ticketing, hospitality, and door operations
                  so every celebration has a strong concept and a clean execution system behind it.
                </p>
              </div>
            </ScrollReveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      <Link href="/contact">{"Plan a themed night"}</Link>
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
              <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Why People Book TEEZ</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold text-balance md:text-5xl">The guest experience and the backend are handled together.</h2>
                </div>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  A beautiful room matters. So does entry speed, ticket delivery, vendor timing, guest confidence, and
                  the way the event looks after it is over.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <ScrollReveal>
                <div className="h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-lg">
                    <img
                      src={roaring20sGallery[6]}
                      alt="Guests enjoying a TEEZ event"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-primary">
                    <ShieldCheck size={22} />
                    <h3 className="text-2xl font-serif font-bold">One accountable team</h3>
                  </div>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    TEEZ keeps creative, logistics, ticketing, and day-of execution connected, so the event feels refined
                    to guests and manageable to hosts.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: MapPinned,
                    title: "Venue and flow",
                    body: "Arrival, room layout, food, photography, and dance floor decisions are planned around guest movement.",
                  },
                  {
                    icon: Music,
                    title: "Mood and programming",
                    body: "Music, timing, dress code, and visual cues make the night easy to enter and hard to forget.",
                  },
                  {
                    icon: BadgeCheck,
                    title: "Guest confidence",
                    body: "Clear tickets, confirmations, check-in, and communication reduce friction before guests arrive.",
                  },
                  {
                    icon: Camera,
                    title: "Content-ready moments",
                    body: "Photo opportunities are built into the night without making the event feel staged.",
                  },
                ].map((item, index) => {
                  const Icon = item.icon

                  return (
                    <ScrollReveal key={item.title} delay={index * 80} className="h-full">
                      <article className="h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                        <Icon className="text-primary" size={24} />
                        <h3 className="mt-4 text-xl font-serif font-bold">{item.title}</h3>
                        <p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p>
                      </article>
                    </ScrollReveal>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <EventPreviewSection />

        <section className="bg-background py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <ScrollReveal>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Production System</div>
                  <h2 className="mt-4 text-4xl font-serif font-bold text-balance md:text-5xl">A clean process from idea to recap.</h2>
                  <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                    Events feel spontaneous when the plan is strong. We build the structure, then leave space for the
                    moments guests actually remember.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid gap-4 md:grid-cols-2">
                {productionSteps.map((step, index) => (
                  <ScrollReveal key={step.title} delay={index * 80} className="h-full">
                    <article className="h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="text-sm font-semibold text-primary">{String(index + 1).padStart(2, "0")}</div>
                      <h3 className="mt-3 text-2xl font-serif font-bold">{step.title}</h3>
                      <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>
                    </article>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <ScrollReveal delay={120}>
              <div className="mt-12 rounded-lg border border-border bg-[#F7EDDB] p-6">
                <div className="grid gap-4 md:grid-cols-4">
                  {servicePillars.map((pillar) => (
                    <div key={pillar} className="flex items-center gap-3 rounded-lg bg-white/70 p-4">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="font-medium">{pillar}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <TestimonialsSection />

        <section className="bg-[#1C2431] py-16 text-white lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal>
              <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-block">
                    <div className="relative h-20 w-20">
                      <Image
                        src="/images/screenshot-202026-01-10-20at-2012.png"
                        alt="TEEZ Events"
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
                      <Link href="/contact">{"Plan an Event"}</Link>
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
