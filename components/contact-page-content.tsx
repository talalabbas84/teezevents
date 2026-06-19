"use client"

import { useActionState, useEffect, useState } from "react"
import { Instagram, Mail, MessageCircle, Send } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitContactInquiry } from "@/actions/contact"

type ContactPageContentProps = {
  eventParam?: string
  intentParam?: string
}

export function ContactPageContent({ eventParam, intentParam }: ContactPageContentProps) {
  const [state, formAction, isPending] = useActionState(submitContactInquiry, null)

  const isBlossomInquiry = eventParam === "blossom"

  // Default field values for Blossom pre-fill
  const defaultEventType = isBlossomInquiry ? "dance-social" : ""
  const defaultDate = isBlossomInquiry ? "2026-04-25" : ""
  const defaultMessage = isBlossomInquiry
    ? intentParam === "rsvp"
      ? "Hi, I'd like to RSVP for BLOSSOM on April 25, 2026 and receive the e-transfer details."
      : "Hi, I'm interested in tickets for BLOSSOM on April 25, 2026. Please share the next steps."
    : ""

  // Reset form key to clear inputs after successful submission
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state?.success) {
      setFormKey((k) => k + 1)
    }
  }, [state?.success])

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      details: "info@teezevents.ca",
      link: "mailto:info@teezevents.ca",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      details: "Chat with us on WhatsApp",
      link: "https://wa.me/14169086459",
    },
    {
      icon: Instagram,
      title: "Instagram DM",
      details: "Send us a DM on Instagram",
      link: "https://instagram.com/teez.events",
    },
    // {
    //   icon: MapPin,
    //   title: "Visit Us",
    //   details: "Toronto",
    //   link: "https://maps.google.com",
    // },
    // {
    //   icon: Clock,
    //   title: "Office Hours",
    //   details: "Mon-Fri: 9AM-6PM, Sat: 10AM-4PM",
    //   link: null,
    // },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
          <div className="container relative mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-6 animate-fade-in-up text-5xl font-serif font-bold text-balance md:text-6xl lg:text-7xl">
                {isBlossomInquiry ? "BLOSSOM RSVP" : "Let's Create Something Amazing"}
              </h1>
              <p className="animate-fade-in-up text-xl leading-relaxed text-muted-foreground md:text-2xl">
                {isBlossomInquiry
                  ? "Use this form if you need a manual RSVP for BLOSSOM. The secure card checkout now lives directly on the event page."
                  : "Ready to bring your event vision to life? Get in touch with us and let's start planning your unforgettable celebration."}
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-16 grid gap-6 md:grid-cols-3">
              {contactInfo.map((info, index) => (
                <Card
                  key={index}
                  className="group border-2 text-center transition-all hover:border-primary hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <info.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-serif font-bold">{info.title}</h3>
                    {info.link ? (
                      <a
                        href={info.link}
                        target={info.link.startsWith("http") ? "_blank" : undefined}
                        rel={info.link.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-muted-foreground transition-colors hover:text-primary"
                      >
                        {info.details}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">{info.details}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-6 text-3xl font-serif font-bold md:text-4xl">Send Us a Message</h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  {isBlossomInquiry
                    ? "Tell us who's coming and we'll send over BLOSSOM payment details within 24 hours."
                    : "Fill out the form below and we'll get back to you within 24 hours."}
                </p>

                {isBlossomInquiry && (
                  <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/10 p-5">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                      Saturday, April 25, 2026 • 6:00 PM
                    </div>
                    <div className="mb-2 text-lg font-serif font-bold">BLOSSOM in Downtown Toronto</div>
                    <p className="leading-relaxed text-muted-foreground">
                      Ticket price is $22. If you prefer a manual RSVP instead of card checkout, use this form and
                      we&apos;ll follow up with next steps and venue details.
                    </p>
                  </div>
                )}

                <form
                  key={formKey}
                  id="contact-form"
                  action={formAction}
                  className="space-y-6"
                >
                  <input type="hidden" name="source" value={isBlossomInquiry ? "blossom" : "general"} />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        required
                        className="border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        required
                        className="border-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(123) 456-7890"
                        className="border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventType">Event Type</Label>
                      <select
                        id="eventType"
                        name="eventType"
                        defaultValue={defaultEventType}
                        className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select an event type</option>
                        <option value="weddings">Weddings</option>
                        <option value="birthday-party">Birthday Party</option>
                        <option value="bachelorette">Bachelorette</option>
                        <option value="bachelor-parties">Bachelor Parties</option>
                        <option value="birthday-parties">Birthday Parties</option>
                        <option value="dance-social">Dance Social</option>
                        <option value="promotion">Promotion</option>
                        <option value="celebration-party">Celebration Party</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Preferred Event Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={defaultDate}
                      className="border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      defaultValue={defaultMessage}
                      placeholder="Share your message, ideas, and any specific requirements..."
                      required
                      rows={6}
                      className="resize-none border-2"
                    />
                  </div>

                  {state?.success && (
                    <div className="rounded-md border-2 border-green-300 bg-green-50 p-4 text-green-800">
                      Thank you! We&apos;ve received your message and will be in touch within 24 hours.
                    </div>
                  )}

                  {state?.error && (
                    <div className="rounded-md border-2 border-red-200 bg-red-50 p-4 text-red-700">
                      {state.error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-accent"
                    disabled={isPending}
                  >
                    {isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2" size={20} />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* <div className="space-y-8">
                <div>
                  <h2 className="mb-6 text-3xl font-serif font-bold md:text-4xl">Visit Our Office</h2>
                  <p className="mb-6 text-lg text-muted-foreground">
                    We'd love to meet you in person! Stop by our office for a consultation and let's discuss your
                    event ideas over coffee.
                  </p>

                  <div className="aspect-video overflow-hidden rounded-lg border-2 border-border">
                    <img
                      src="/office-location-map-placeholder.jpg"
                      alt="Office location map"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-xl font-serif font-bold">Quick Questions?</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="mb-1 font-medium">How far in advance should I book?</div>
                        <p className="text-muted-foreground">
                          We recommend booking 3-6 months in advance for optimal availability.
                        </p>
                      </div>
                      <div>
                        <div className="mb-1 font-medium">Do you handle corporate events?</div>
                        <p className="text-muted-foreground">
                          Yes! We specialize in both corporate and social events of all sizes.
                        </p>
                      </div>
                      <div>
                        <div className="mb-1 font-medium">What's included in your services?</div>
                        <p className="text-muted-foreground">
                          Full event planning, venue coordination, catering, entertainment, and more.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div> */}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
