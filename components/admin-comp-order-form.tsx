"use client"

import type { FormEvent } from "react"

import Link from "next/link"
import { useState } from "react"
import { Gift, Loader2, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type EventOption = {
  id: string
  title: string
  dateLabel: string
}

type CreatedCompOrder = {
  id: string
  orderNumber: string
  accessToken: string | null
  customerEmail: string
  quantity: number
  internalLabel: string | null
  source: string
}

export function AdminCompOrderForm({
  events,
  ticketEmailConfigured,
}: {
  events: EventOption[]
  ticketEmailConfigured: boolean
}) {
  const [eventId, setEventId] = useState(events[0]?.id || "")
  const [internalLabel, setInternalLabel] = useState("Performer")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(ticketEmailConfigured)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{
    order: CreatedCompOrder
    emailStatus: string
    emailRecipient: string
  } | null>(null)
  const singleEvent = events.length === 1

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess(null)
    setIsSubmitting(true)

    const response = await fetch("/api/admin/comp-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        internalLabel,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        quantity,
        notes: notes || undefined,
        sendEmail,
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
      setError(payload?.error || "Unable to create complimentary tickets.")
      return
    }

    setSuccess({
      order: payload.order,
      emailStatus: payload.emailStatus,
      emailRecipient: payload.emailRecipient,
    })
    setIsSubmitting(false)
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setQuantity(1)
    setNotes("")
  }

  return (
    <Card className="border border-border shadow-xl">
      <CardContent className="space-y-6 p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <Gift className="text-primary" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Complimentary Tickets</div>
            <h2 className="text-2xl font-serif font-bold">Create comp orders for performers and guests</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="comp-event">Event</Label>
              {singleEvent ? (
                <Input value={events[0] ? `${events[0].title} • ${events[0].dateLabel}` : ""} disabled />
              ) : (
                <select
                  id="comp-event"
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isSubmitting}
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {`${event.title} • ${event.dateLabel}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-label">Ticket Label</Label>
              <select
                id="comp-label"
                value={internalLabel}
                onChange={(event) => setInternalLabel(event.target.value)}
                className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isSubmitting}
              >
                {["Performer", "Special Guest", "VIP Guest", "Sponsor", "Media", "Staff", "Complimentary"].map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comp-quantity">Quantity</Label>
              <Input
                id="comp-quantity"
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="comp-name">Guest Name</Label>
              <Input
                id="comp-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Performer or guest name"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-email">Guest Email</Label>
              <Input
                id="comp-email"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="guest@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-phone">Phone</Label>
              <Input
                id="comp-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Optional phone number"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comp-notes">Internal Notes</Label>
            <Textarea
              id="comp-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Why this guest is complimentary, arrival notes, backstage access, etc."
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/10 p-4">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              disabled={isSubmitting || !ticketEmailConfigured}
              className="mt-1"
            />
            <span className="text-sm text-muted-foreground">
              <span className="block font-medium text-foreground">Email tickets after creation</span>
              {ticketEmailConfigured
                ? "Send the wallet and attached ticket pack to the guest automatically."
                : "SMTP is not configured yet, so complimentary tickets will be created without email delivery."}
            </span>
          </label>

          {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

          {success && (
            <div className="rounded-2xl border border-primary/15 bg-primary/10 p-5 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">{`Created ${success.order.quantity} complimentary ticket(s) on ${success.order.orderNumber}.`}</div>
              <div className="mt-2">{`Type: ${success.order.internalLabel || "Complimentary"} • Delivery: ${success.emailStatus}`}</div>
              <div className="mt-1">{`Recipient: ${success.emailRecipient}`}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {success.order.accessToken && (
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                    <Link href={`/tickets/${success.order.accessToken}`}>Open Wallet</Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                  <a href={`/api/admin/orders/${success.order.id}/download`}>Download Pack</a>
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-accent" disabled={isSubmitting}>
            <span className="inline-flex items-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
              Create Complimentary Tickets
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
