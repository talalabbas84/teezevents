"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { CheckCircle2, Mail, MessageSquareText, Star, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RsvpStatus = "GOING" | "INTERESTED" | "CANT_GO"

const statusOptions: Array<{
  value: RsvpStatus
  label: string
  description: string
  icon: typeof CheckCircle2
}> = [
  {
    value: "GOING",
    label: "Going",
    description: "Hold my interest",
    icon: CheckCircle2,
  },
  {
    value: "INTERESTED",
    label: "Interested",
    description: "Remind me",
    icon: Star,
  },
  {
    value: "CANT_GO",
    label: "Can't go",
    description: "Future invites",
    icon: XCircle,
  },
]

export function EventRsvpCapture({
  eventId,
  eventTitle,
  source = "EVENT_PAGE",
  compact = false,
}: {
  eventId: string
  eventTitle: string
  source?: "EVENT_PAGE" | "CHECKOUT"
  compact?: boolean
}) {
  const [status, setStatus] = useState<RsvpStatus>("INTERESTED")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [emailOptIn, setEmailOptIn] = useState(true)
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")

    if (smsOptIn && !phone.trim()) {
      setError("Add a phone number to receive text updates.")
      return
    }

    setIsSubmitting(true)

    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        name,
        email,
        phone: phone || undefined,
        emailOptIn,
        smsOptIn,
        source,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSubmitting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      setIsSubmitting(false)
      setError(payload?.error || "Unable to save your response.")
      return
    }

    setIsSubmitting(false)
    setMessage("Saved. We have your response for this event.")
  }

  return (
    <section className={`rounded-2xl border border-primary/20 bg-primary/10 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-primary/15 p-2 text-primary">
          <Mail size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">RSVP</div>
          <h2 className={`${compact ? "text-xl" : "text-2xl"} mt-1 font-serif font-bold`}>Not ready to buy?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {`Tell us your plan for ${eventTitle}. This saves your contact, not a ticket.`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {statusOptions.map((option) => {
            const Icon = option.icon
            const selected = status === option.value

            return (
              <button
                key={option.value}
                type="button"
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selected ? "border-primary bg-background text-foreground" : "border-border bg-background/50 hover:border-primary/50"
                }`}
                onClick={() => setStatus(option.value)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={16} className="text-primary" />
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
              </button>
            )
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${source}-rsvp-name`}>Name</Label>
            <Input
              id={`${source}-rsvp-name`}
              value={name}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
              placeholder="Your name"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${source}-rsvp-email`}>Email</Label>
            <Input
              id={`${source}-rsvp-email`}
              type="email"
              value={email}
              onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${source}-rsvp-phone`}>Phone</Label>
          <Input
            id={`${source}-rsvp-phone`}
            type="tel"
            value={phone}
            onChange={(inputEvent) => setPhone(inputEvent.target.value)}
            placeholder="(555) 555-5555"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background/70 p-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={emailOptIn}
              onChange={(inputEvent) => setEmailOptIn(inputEvent.target.checked)}
              disabled={isSubmitting}
            />
            <span>
              <span className="font-medium">Email updates and offers</span>
              <span className="block text-xs text-muted-foreground">Event reminders, price drops, and future invites.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={smsOptIn}
              onChange={(inputEvent) => setSmsOptIn(inputEvent.target.checked)}
              disabled={isSubmitting}
            />
            <span>
              <span className="inline-flex items-center gap-2 font-medium">
                <MessageSquareText size={14} className="text-primary" />
                Text updates
              </span>
              <span className="block text-xs text-muted-foreground">Event texts and promotional messages. Message rates may apply.</span>
            </span>
          </label>
        </div>

        {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {message && <div className="rounded-xl border border-primary/15 bg-background/80 p-3 text-sm text-primary">{message}</div>}

        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-accent" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save RSVP"}
        </Button>
      </form>
    </section>
  )
}
