"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function formatCurrency(amountInCents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

export function CheckoutForm({
  eventId,
  eventTitle,
  ticketPriceCents,
  currency,
  availableTickets,
  maxTicketsPerOrder = 4,
}: {
  eventId: string
  eventTitle: string
  ticketPriceCents: number
  currency: string
  availableTickets: number
  maxTicketsPerOrder?: number
}) {
  const soldOut = availableTickets <= 0
  const maxQuantity = Math.max(1, Math.min(availableTickets || 1, maxTicketsPerOrder))
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (soldOut) {
      setError("This event is sold out.")
      return
    }

    setError("")
    setIsSubmitting(true)

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone || undefined,
        quantity,
        notes: notes || undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSubmitting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.checkoutUrl) {
      setIsSubmitting(false)
      setError(payload?.error || "Unable to start checkout.")
      return
    }

    window.location.assign(payload.checkoutUrl)
  }

  const total = quantity * ticketPriceCents

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="checkout-name">{"Full Name"}</Label>
          <Input
            id="checkout-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
            disabled={isSubmitting || soldOut}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-email">{"Email"}</Label>
          <Input
            id="checkout-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={isSubmitting || soldOut}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="checkout-phone">{"Phone Number"}</Label>
          <Input
            id="checkout-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(555) 555-5555"
            disabled={isSubmitting || soldOut}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-quantity">{"Tickets"}</Label>
          <Input
            id="checkout-quantity"
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(event) => {
              const nextValue = Number(event.target.value)

              if (!Number.isFinite(nextValue)) {
                setQuantity(1)
                return
              }

              setQuantity(Math.min(maxQuantity, Math.max(1, Math.trunc(nextValue))))
            }}
            required
            disabled={isSubmitting || soldOut}
          />
          <p className="text-xs text-muted-foreground">
            {`Up to ${maxQuantity} ticket${maxQuantity === 1 ? "" : "s"} per order.`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="checkout-notes">{"Notes"}</Label>
        <Textarea
          id="checkout-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={`Anything we should know before ${eventTitle}?`}
          rows={4}
          disabled={isSubmitting || soldOut}
        />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-5">
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{"Price per ticket"}</span>
          <span>{formatCurrency(ticketPriceCents, currency.toUpperCase())}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-base font-semibold">
          <span>{"Total"}</span>
          <span>{formatCurrency(total, currency.toUpperCase())}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {"Your selected tickets are held for 30 minutes once Stripe Checkout opens."}
        </p>
      </div>

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm">{error}</div>}

      <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-accent" disabled={isSubmitting || soldOut}>
        {soldOut ? "Sold Out" : isSubmitting ? "Opening Secure Checkout..." : "Continue to Secure Checkout"}
      </Button>
    </form>
  )
}
