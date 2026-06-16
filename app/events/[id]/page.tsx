import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Info,
  MapPin,
  MessageCircle,
  Sparkles,
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { EventRsvpCapture } from "@/components/event-rsvp-capture"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  getEventPrimaryTicketHref,
  getEventPrimaryTicketLabel,
  supportsCheckout,
} from "@/lib/events"
import { getCheckoutSetupIssue, getEventInventorySnapshot } from "@/lib/checkout"
import { getPublicEventById } from "@/lib/public-events"

const eventPlanningHref =
  "mailto:info@teezevents.ca?subject=Plan%20an%20event%20with%20Teez%20Events%20Co."

export const dynamic = "force-dynamic"

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

function StatBlock({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="border-l border-white/25 pl-4">
      <div className="text-3xl font-serif font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/75">{label}</div>
    </div>
  )
}

function toCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function getEventEndDate(start: Date) {
  const end = new Date(start)
  end.setHours(end.getHours() + 4)
  return end
}

function getGoogleCalendarHref(event: {
  title: string
  startsAtIso?: string
  description: string
  venue?: string
  location: string
  address?: string
}) {
  if (!event.startsAtIso) {
    return null
  }

  const start = new Date(event.startsAtIso)
  const end = getEventEndDate(start)
  const location = event.address || event.venue || event.location
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
    details: event.description,
    location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function getMapsHref(event: { address?: string; venue?: string; location: string }) {
  const query = event.address || event.venue || event.location
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function MiniActionLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: ReactNode
}) {
  return (
    <Button variant="outline" className="justify-start border-2 border-primary/30 bg-background/70" asChild>
      <Link href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {icon}
        {label}
      </Link>
    </Button>
  )
}

function GuestCluster({ going }: { going: number }) {
  const initials = ["AT", "MR", "SG", "DF", "JT"]

  return (
    <div className="flex items-center">
      {initials.map((initial, index) => (
        <Avatar key={initial} className="-ml-2 size-9 border-2 border-card first:ml-0">
          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initial}</AvatarFallback>
        </Avatar>
      ))}
      <div className="ml-3 text-sm text-muted-foreground">{`${going} going so far`}</div>
    </div>
  )
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
  const checkoutIssue = inventory ? null : event.category === "Upcoming Event" ? getCheckoutSetupIssue(null) : null
  const heroImage = event.gallery[0] || event.image || "/placeholder.svg"
  const gallery = event.gallery.length > 0 ? event.gallery : [event.image || "/placeholder.svg"]
  const usedCapacity = event.capacity && typeof event.spotsLeft === "number" ? event.capacity - event.spotsLeft : null
  const capacityPercent =
    event.capacity && usedCapacity !== null ? Math.min(Math.max((usedCapacity / event.capacity) * 100, 0), 100) : null
  const calendarHref = getGoogleCalendarHref(event)
  const mapsHref = getMapsHref(event)
  const shareUrl = `/events/${event.id}`
  const shareText = event.shareText || `Join me at ${event.title} by TEEZ.`
  const smsHref = `sms:?&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
  const mailHref = `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#111827]">
          <img src={heroImage} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.92),rgba(17,24,39,0.68)_48%,rgba(17,24,39,0.3))]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,#eadfcb,rgba(234,223,203,0))]" />

          <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-end">
            <div className="container mx-auto px-4 pb-14 lg:px-8 lg:pb-20">
              <Link
                href="/events"
                className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
              >
                <ArrowLeft size={18} />
                {"Back to Events"}
              </Link>

              <div className="max-w-5xl">
                <div className="mb-5 flex flex-wrap gap-3">
                  <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {event.category}
                  </span>
                  {event.ticketPrice && (
                    <span className="rounded-lg border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                      {event.ticketPrice}
                    </span>
                  )}
                  <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {event.attendees} guests
                  </span>
                </div>

                <h1 className="text-5xl font-serif font-bold leading-tight text-white text-balance md:text-6xl lg:text-7xl">
                  {event.title}
                </h1>
                <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/85 md:text-2xl">
                  {event.previewDescription}
                </p>

                <div className="mt-8 grid gap-4 text-white/90 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-[#D88C4A]" />
                    <span>{event.date}</span>
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-[#D88C4A]" />
                      <span>{event.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin size={20} className="text-[#D88C4A]" />
                    <span>{event.venue ? `${event.venue} • ${event.location}` : event.location}</span>
                  </div>
                </div>

                <div className="mt-10 grid max-w-3xl gap-5 sm:grid-cols-3">
                  <StatBlock value={event.attendees} label="Guests hosted" />
                  <StatBlock value={event.gallery.length.toString()} label="Gallery moments" />
                  <StatBlock value={event.category === "Past Event" ? "5.0" : `${event.spotsLeft ?? "Limited"}`} label={event.category === "Past Event" ? "Guest energy" : "Spots left"} />
                </div>

                {event.category === "Upcoming Event" && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    {calendarHref && (
                      <Button className="bg-white text-[#1C2431] hover:bg-[#EADFCB]" asChild>
                        <Link href={calendarHref} target="_blank" rel="noreferrer">
                          <CalendarPlus className="mr-2" size={18} />
                          {"Add to Calendar"}
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white hover:text-[#1C2431]" asChild>
                      <Link href={mapsHref} target="_blank" rel="noreferrer">
                        <MapPin className="mr-2" size={18} />
                        {"Open Map"}
                      </Link>
                    </Button>
                    <Button variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white hover:text-[#1C2431]" asChild>
                      <Link href={smsHref}>
                        <Share2 className="mr-2" size={18} />
                        {"Share"}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <div className="space-y-12">
                <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Event Story</div>
                    <h2 className="mt-3 text-4xl font-serif font-bold text-balance">Designed for arrival, movement, and memory.</h2>
                  </div>
                  <p className="text-lg leading-relaxed text-muted-foreground">{event.description}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {event.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" />
                        <p className="leading-relaxed text-muted-foreground">{highlight}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {event.category === "Upcoming Event" && (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {(event.perks || [
                      {
                        title: "Fast checkout",
                        description: "Reserve tickets online and receive confirmation after payment.",
                      },
                      {
                        title: "Live capacity",
                        description: "Availability updates as orders are placed.",
                      },
                      {
                        title: "Guest details",
                        description: "Arrival notes are shared before the event.",
                      },
                      {
                        title: "Door-ready tickets",
                        description: "Digital tickets are built for quick check-in.",
                      },
                    ]).map((perk) => (
                      <article key={perk.title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                        <Star size={18} className="text-primary" />
                        <h3 className="mt-3 font-serif text-xl font-bold">{perk.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{perk.description}</p>
                      </article>
                    ))}
                  </div>
                )}

                {event.timeline && event.timeline.length > 0 && (
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Run of Show</div>
                      <h2 className="mt-3 text-3xl font-serif font-bold">What happens when</h2>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="space-y-6">
                        {event.timeline.map((item, index) => (
                          <div key={`${item.time}-${item.title}`} className="grid gap-4 md:grid-cols-[120px_1fr]">
                            <div className="font-serif text-2xl font-bold text-primary">{item.time}</div>
                            <div className="border-l border-border pl-5">
                              <div className="flex items-center gap-3">
                                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                  {index + 1}
                                </span>
                                <h3 className="text-xl font-serif font-bold">{item.title}</h3>
                              </div>
                              <p className="mt-2 leading-relaxed text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {event.sections && event.sections.length > 0 && (
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Production Notes</div>
                      <h2 className="mt-3 text-3xl font-serif font-bold">How the night came together</h2>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      {event.sections.map((section) => (
                        <article key={section.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                          <h3 className="text-xl font-serif font-bold">{section.title}</h3>
                          <div className="mt-3 space-y-3">
                            {section.body.map((paragraph) => (
                              <p key={paragraph} className="leading-relaxed text-muted-foreground">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {event.kindNote && (
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-6">
                    <div className="mb-3 flex items-center gap-3 text-primary">
                      <Camera size={20} />
                      <h3 className="text-xl font-serif font-bold">{"Kind Note"}</h3>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{event.kindNote}</p>
                  </div>
                )}

                {event.faqs && event.faqs.length > 0 && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Guest Questions</div>
                      <h2 className="mt-3 text-3xl font-serif font-bold">Before you RSVP</h2>
                    </div>
                    <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-6 shadow-sm">
                      {event.faqs.map((faq) => (
                        <AccordionItem key={faq.question} value={faq.question}>
                          <AccordionTrigger className="text-base font-semibold">
                            <span className="flex items-center gap-3">
                              <HelpCircle size={18} className="text-primary" />
                              {faq.question}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </div>

              <aside>
                <div className="sticky top-24 space-y-5">
                  {event.category === "Upcoming Event" ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-6">
                      <h2 className="text-2xl font-serif font-bold">{"Tickets"}</h2>
                      <div className="mt-5 space-y-3 rounded-lg bg-background/80 p-4">
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
                        {event.capacity && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{"Capacity"}</span>
                            <span className="font-semibold">{event.capacity}</span>
                          </div>
                        )}
                      </div>
                      {/* {capacityPercent !== null && (
                        <div className="mt-5 rounded-lg bg-background/80 p-4">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <span className="text-sm font-medium">{"Live availability"}</span>
                            <span className="text-sm text-muted-foreground">
                              {`${event.spotsLeft ?? 0} left`}
                            </span>
                          </div>
                          <Progress value={capacityPercent} />
                          <p className="mt-3 text-xs text-muted-foreground">
                            {usedCapacity && usedCapacity > 0
                              ? `${usedCapacity} spots are already held or confirmed.`
                              : "Tickets are still early in release."}
                          </p>
                        </div>
                      )} */}
                      <p className="mt-5 leading-relaxed text-muted-foreground">
                        {event.ticketNote || "Secure your spot for this upcoming event."}
                      </p>
                      {inventory?.ticketTiers.length ? (
                        <div className="mt-5 space-y-3 rounded-lg bg-background/80 p-4">
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
                      {checkoutIssue && !inventory && (
                        <p className="mt-4 text-sm text-muted-foreground">{checkoutIssue.description}</p>
                      )}
                      <div className="mt-6 space-y-3">
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
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center gap-3 text-primary">
                        <Sparkles size={20} />
                        <h2 className="text-xl font-serif font-bold">{"Event Success"}</h2>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-3xl font-serif font-bold text-primary">{event.attendees}</div>
                          <div className="text-sm text-muted-foreground">{"Guests"}</div>
                        </div>
                        <div>
                          <div className="text-3xl font-serif font-bold text-primary">{"5.0"}</div>
                          <div className="text-sm text-muted-foreground">{"Energy"}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {event.category === "Upcoming Event" && (
                    <EventRsvpCapture eventId={event.id} eventTitle={event.title} source="EVENT_PAGE" compact />
                  )}

                  {event.guestStats && (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <UserCheck size={20} className="text-primary" />
                        <h3 className="text-xl font-serif font-bold">{"Guest List"}</h3>
                      </div>
                      <GuestCluster going={event.guestStats.going} />
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

                  {event.category === "Upcoming Event" && (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <Share2 size={20} className="text-primary" />
                        <h3 className="text-xl font-serif font-bold">{"Share & Save"}</h3>
                      </div>
                      <div className="grid gap-3">
                        {calendarHref && (
                          <MiniActionLink
                            href={calendarHref}
                            label="Add to Google Calendar"
                            icon={<CalendarPlus className="mr-2" size={16} />}
                          />
                        )}
                        <MiniActionLink
                          href={mapsHref}
                          label="Open in Maps"
                          icon={<ExternalLink className="mr-2" size={16} />}
                        />
                        <MiniActionLink
                          href={smsHref}
                          label="Text a Friend"
                          icon={<MessageCircle className="mr-2" size={16} />}
                        />
                        <MiniActionLink
                          href={mailHref}
                          label="Email Invite"
                          icon={<Share2 className="mr-2" size={16} />}
                        />
                      </div>
                    </div>
                  )}

                  {event.policies && event.policies.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <ShieldCheck size={20} className="text-primary" />
                        <h3 className="text-xl font-serif font-bold">{"Ticket Policies"}</h3>
                      </div>
                      <div className="space-y-4">
                        {event.policies.map((policy) => (
                          <div key={policy.title}>
                            <div className="flex items-center gap-2 font-semibold">
                              <Info size={16} className="text-primary" />
                              {policy.title}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{policy.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-[#1C2431] p-6 text-white shadow-sm">
                    <Users size={22} className="text-[#D88C4A]" />
                    <h3 className="mt-4 text-xl font-serif font-bold">{"Want this kind of room?"}</h3>
                    <p className="mt-3 leading-relaxed text-white/80">
                      {"Tell us the mood, the crowd, and the moment. We’ll build the flow, visuals, vendors, ticketing, and guest experience around it."}
                    </p>
                    <Button className="mt-5 w-full bg-[#D88C4A] text-[#1C2431] hover:bg-primary" asChild>
                      <Link href={eventPlanningHref}>{"Plan with TEEZ"}</Link>
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-[#1C2431] py-16 text-white lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#D88C4A]">Gallery</div>
                <h2 className="mt-3 text-4xl font-serif font-bold text-balance">Every frame tells part of the room.</h2>
              </div>
              <p className="max-w-xl text-white/70">
                {"A full visual archive from arrival to dance floor, built for guests to remember the texture and feeling of the night."}
              </p>
            </div>

            <div className="grid auto-rows-[190px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.map((image, index) => {
                const feature = index === 0 || index === 5

                return (
                  <figure
                    key={image}
                    className={`group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 ${
                      feature ? "sm:col-span-2 sm:row-span-2" : ""
                    }`}
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`${event.title} gallery photo ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {`${event.title} • Moment ${index + 1}`}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
