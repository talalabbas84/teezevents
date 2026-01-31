"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, MapPin, Clock, Send, MessageCircle, Instagram } from "lucide-react"
import { useState } from "react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    date: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setSubmitStatus("success")

    // Reset form after success
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        phone: "",
        eventType: "",
        date: "",
        message: "",
      })
      setSubmitStatus("idle")
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      details: "info@teasevents.ca",
      link: "mailto:info@teasevents.ca",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      details: "Chat with us on WhatsApp",
      link: "https://wa.me/1234567890",
    },
    {
      icon: Instagram,
      title: "Instagram DM",
      details: "Send us a DM on Instagram",
      link: "https://instagram.com",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      details: "Toronto",
      link: "https://maps.google.com",
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: "Mon-Fri: 9AM-6PM, Sat: 10AM-4PM",
      link: null,
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 text-balance animate-fade-in-up">
                {"Let's Create Something Amazing"}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed animate-fade-in-up">
                {
                  "Ready to bring your event vision to life? Get in touch with us and let's start planning your unforgettable celebration."
                }
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
              {contactInfo.map((info, index) => (
                <Card
                  key={index}
                  className="border-2 hover:border-primary transition-all hover:shadow-lg text-center group"
                >
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <info.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-serif font-bold mb-2">{info.title}</h3>
                    {info.link ? (
                      <a
                        href={info.link}
                        target={info.link.startsWith("http") ? "_blank" : undefined}
                        rel={info.link.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-muted-foreground hover:text-primary transition-colors"
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

            {/* Contact Form and Map */}
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">{"Send Us a Message"}</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  {"Fill out the form below and we'll get back to you within 24 hours."}
                </p>

                <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{"Full Name *"}</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                        className="border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{"Email Address *"}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                        className="border-2"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{"Phone Number"}</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        className="border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventType">{"Event Type"}</Label>
                      <select
                        id="eventType"
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border-2 border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">{"Select an event type"}</option>
                        <option value="weddings">{"Weddings"}</option>
                        <option value="birthday-party">{"Birthday Party"}</option>
                        <option value="bachelorette">{"Bachelorette"}</option>
                        <option value="bachelor-parties">{"Bachelor Parties"}</option>
                        <option value="birthday-parties">{"Birthday Parties"}</option>
                        <option value="dance-social">{"Dance Social"}</option>
                        <option value="promotion">{"Promotion"}</option>
                        <option value="celebration-party">{"Celebration Party"}</option>
                        <option value="others">{"Others"}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">{"Preferred Event Date"}</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{"Your Message *"}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Share your message, ideas, and any specific requirements..."
                      required
                      rows={6}
                      className="border-2 resize-none"
                    />
                  </div>

                  {submitStatus === "success" && (
                    <div className="bg-accent/20 border-2 border-accent text-accent-foreground p-4 rounded-md">
                      {"Thank you! We've received your message and will be in touch soon."}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-accent"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2" size={20} />
                        {"Send Message"}
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Map and Additional Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">{"Visit Our Office"}</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    {
                      "We'd love to meet you in person! Stop by our office for a consultation and let's discuss your event ideas over coffee."
                    }
                  </p>

                  {/* Map Placeholder */}
                  <div className="aspect-video rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src="/office-location-map-placeholder.jpg"
                      alt="Office location map"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* FAQ Section */}
                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-serif font-bold mb-4">{"Quick Questions?"}</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="font-medium mb-1">{"How far in advance should I book?"}</div>
                        <p className="text-muted-foreground">
                          {"We recommend booking 3-6 months in advance for optimal availability."}
                        </p>
                      </div>
                      <div>
                        <div className="font-medium mb-1">{"Do you handle corporate events?"}</div>
                        <p className="text-muted-foreground">
                          {"Yes! We specialize in both corporate and social events of all sizes."}
                        </p>
                      </div>
                      <div>
                        <div className="font-medium mb-1">{"What's included in your services?"}</div>
                        <p className="text-muted-foreground">
                          {"Full event planning, venue coordination, catering, entertainment, and more."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}
