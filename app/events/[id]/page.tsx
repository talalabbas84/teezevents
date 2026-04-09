import type { ReactNode } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  Camera,
  Clock,
  CreditCard,
  MapPin,
  Play,
  Ticket,
  UserCheck,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  allEvents,
  getEventPrimaryTicketHref,
  getEventPrimaryTicketLabel,
  supportsCheckout,
} from "@/lib/events"
import { getEventInventorySnapshot } from "@/lib/checkout"
import { getPublicEventById } from "@/lib/public-events"

function ActionButton({
  href,
  label,
  icon,
  variant = "default",
}: {
  href: string
  label: string
  icon: ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <Button
      className={
        variant === "default"
          ? "w-full bg-primary text-primary-foreground hover:bg-accent"
          : "w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      }
      size="lg"
      variant={variant}
      asChild
    >
      <Link href={href}>
        {icon}
        {label}
      </Link>
    </Button>
  )
}

export function generateStaticParams() {
  return allEvents.map((event) => ({ id: event.id }))
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getPublicEventById(id)

  if (!event) {
    notFound()
  }

  const buyTicketHref = getEventPrimaryTicketHref(event)
  const buyTicketLabel = getEventPrimaryTicketLabel(event)
  const inventory = event.category === "Upcoming Event" ? await getEventInventorySnapshot(id).catch(() => null) : null

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <div className="relative h-[60vh] min-h-[500px]">
          <img src={event.gallery[0] || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-16">
            <div className="container mx-auto">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-white hover:text-accent transition-colors mb-6"
              >
                <ArrowLeft size={20} />
                {"Back to Events"}
              </Link>
              <div className="mb-4 flex flex-wrap gap-3">
                {event.category === "Upcoming Event" && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {"Upcoming"}
                  </span>
                )}
                {event.ticketPrice && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {event.ticketPrice}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 text-balance">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar size={20} />
                  <span className="text-lg">{event.date}</span>
                </div>
                {event.time && (
                  <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="text-lg">{event.time}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin size={20} />
                  <span className="text-lg">{event.venue ? `${event.venue} • ${event.location}` : event.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <h2 className="text-3xl font-serif font-bold mb-6">{"About This Event"}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-10">{event.description}</p>

                <h3 className="text-2xl font-serif font-bold mb-4">{"Event Highlights"}</h3>
                <ul className="space-y-3 mb-12">
                  {event.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>

                {event.sections && event.sections.length > 0 && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-serif font-bold mb-6">{"Plan Your Night"}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {event.sections.map((section) => (
                        <div key={section.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                          <h4 className="text-xl font-serif font-bold mb-3">{section.title}</h4>
                          <div className="space-y-3">
                            {section.body.map((paragraph, index) => (
                              <p key={index} className="text-muted-foreground leading-relaxed">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {event.kindNote && (
                  <div className="mb-12 rounded-2xl border border-primary/20 bg-primary/10 p-6">
                    <div className="mb-3 flex items-center gap-3 text-primary">
                      <Camera size={20} />
                      <h3 className="text-xl font-serif font-bold">{"Kind Note"}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{event.kindNote}</p>
                  </div>
                )}

                {event.videoUrl && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-serif font-bold mb-6">{"Event Highlights Video"}</h3>
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group cursor-pointer">
                      <img
                        src={event.gallery[1] || "/placeholder.svg"}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play size={32} className="text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="sticky top-24 space-y-6">
                  {event.category === "Upcoming Event" && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6">
                      <h3 className="text-xl font-serif font-bold mb-4">{"Tickets"}</h3>
                      <div className="mb-5 space-y-3 rounded-xl bg-background/80 p-4">
                        {event.ticketPrice && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{"Price"}</span>
                            <span className="font-semibold">{event.ticketPrice}</span>
                          </div>
                        )}
                        {event.hostedBy && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{"Hosted by"}</span>
                            <span className="font-semibold">{event.hostedBy}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {event.ticketNote || "Secure your spot for this upcoming event."}
                      </p>
                      {inventory?.ticketTiers.length ? (
                        <div className="mb-6 space-y-3 rounded-xl bg-background/80 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ticket Tiers</div>
                          {inventory.ticketTiers.map((tier) => (
                            <div key={tier.id} className="flex items-start justify-between gap-4 text-sm">
                              <div>
                                <div className="font-medium">{tier.name}</div>
                                {tier.description && <div className="text-muted-foreground">{tier.description}</div>}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{tier.priceLabel}</div>
                                <div className="text-xs text-muted-foreground">
                                  {tier.available > 0 ? "Available" : "Sold out"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="space-y-3">
                        <ActionButton
                          href={buyTicketHref}
                          label={buyTicketLabel}
                          icon={
                            supportsCheckout(event) ? (
                              <CreditCard className="mr-2" size={18} />
                            ) : (
                              <Ticket className="mr-2" size={18} />
                            )
                          }
                        />
                        {event.ticketsUrl && supportsCheckout(event) && (
                          <ActionButton
                            href={event.ticketsUrl}
                            label={"Request Manual RSVP"}
                            icon={<Ticket className="mr-2" size={18} />}
                            variant="outline"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {event.guestStats && (
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <UserCheck size={20} className="text-primary" />
                        <h3 className="text-xl font-serif font-bold">{"Guest List"}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{"Mutuals"}</span>
                          <span className="font-semibold">{event.guestStats.mutuals}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{"Going"}</span>
                          <span className="font-semibold">{event.guestStats.going}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{"Interested"}</span>
                          <span className="font-semibold">{event.guestStats.interested}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-muted/50 p-6">
                    <h3 className="text-xl font-serif font-bold mb-4">{"Interested in hosting a similar event?"}</h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {"Let us bring your vision to life with expert planning, warm hospitality, and a room full of good energy."}
                    </p>
                    <ActionButton href="/contact" label={"Contact Us"} icon={<ArrowLeft className="mr-2 rotate-180" size={18} />} />
                  </div>

                  {event.category === "Past Event" && (
                    <div className="rounded-2xl border border-accent/20 bg-accent/10 p-6">
                      <h3 className="text-xl font-serif font-bold mb-3">{"Event Success"}</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="text-3xl font-bold text-primary">{event.attendees}</div>
                          <div className="text-sm text-muted-foreground">{"Happy Attendees"}</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-primary">{"5.0"}</div>
                          <div className="text-sm text-muted-foreground">{"Average Rating"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-center">{"Photo Album"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {event.gallery.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`${event.title} photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
