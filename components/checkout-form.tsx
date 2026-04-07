"use client"

import type { FormEvent } from "react"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CheckoutTierView = {
  id: string
  name: string
  description: string | null
  priceCents: number
  priceLabel: string
  quantityLimit: number | null
  maxPerOrder: number | null
  available: number
}

type QuoteResponse = {
  quantity: number
  unitPriceCents: number
  subtotalCents: number
  discountAmountCents: number
  totalPriceCents: number
  currency: string
  availableTickets: number
  maxTicketsPerOrder: number
  selectedTier: {
    id: string
    name: string
    description: string | null
  } | null
  voucher: {
    code: string
    description: string | null
    discountLabel: string
  } | null
}

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
  ticketTiers = [],
  defaultTierId = null,
}: {
  eventId: string
  eventTitle: string
  ticketPriceCents: number
  currency: string
  availableTickets: number
  maxTicketsPerOrder?: number
  ticketTiers?: CheckoutTierView[]
  defaultTierId?: string | null
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [selectedTierId, setSelectedTierId] = useState(defaultTierId || ticketTiers[0]?.id || "")
  const [voucherInput, setVoucherInput] = useState("")
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null)
  const [appliedQuote, setAppliedQuote] = useState<QuoteResponse | null>(null)
  const [voucherMessage, setVoucherMessage] = useState("")
  const [error, setError] = useState("")
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTier = useMemo(
    () => ticketTiers.find((tier) => tier.id === selectedTierId) || null,
    [selectedTierId, ticketTiers],
  )

  const baseAvailable = selectedTier ? selectedTier.available : availableTickets
  const baseMaxPerOrder = Math.max(1, Math.min(maxTicketsPerOrder, selectedTier?.maxPerOrder || maxTicketsPerOrder))
  const displayedPricing = appliedQuote || {
    quantity,
    unitPriceCents: selectedTier?.priceCents || ticketPriceCents,
    subtotalCents: (selectedTier?.priceCents || ticketPriceCents) * quantity,
    discountAmountCents: 0,
    totalPriceCents: (selectedTier?.priceCents || ticketPriceCents) * quantity,
    currency,
    availableTickets: baseAvailable,
    maxTicketsPerOrder: baseMaxPerOrder,
    selectedTier: selectedTier
      ? {
          id: selectedTier.id,
          name: selectedTier.name,
          description: selectedTier.description,
        }
      : null,
    voucher: null,
  }
  const maxQuantity = Math.max(1, Math.min(displayedPricing.availableTickets || 1, displayedPricing.maxTicketsPerOrder))
  const soldOut = displayedPricing.availableTickets <= 0

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), maxQuantity))
  }, [maxQuantity])

  useEffect(() => {
    if (!appliedVoucherCode) {
      setAppliedQuote(null)
      return
    }

    let cancelled = false

    async function refreshAppliedQuote() {
      const response = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          quantity,
          ticketTierId: selectedTierId || undefined,
          voucherCode: appliedVoucherCode,
        }),
      }).catch(() => null)

      if (!response) {
        if (!cancelled) {
          setAppliedVoucherCode(null)
          setAppliedQuote(null)
          setVoucherMessage("Voucher pricing could not be refreshed.")
        }
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.quote) {
        if (!cancelled) {
          setAppliedVoucherCode(null)
          setAppliedQuote(null)
          setVoucherMessage(payload?.error || "Voucher is no longer valid for this selection.")
        }
        return
      }

      if (!cancelled) {
        setAppliedQuote(payload.quote as QuoteResponse)
        setVoucherMessage(
          payload.quote.voucher
            ? `${payload.quote.voucher.code} applied${payload.quote.voucher.discountLabel ? ` • ${payload.quote.voucher.discountLabel}` : ""}`
            : "",
        )
      }
    }

    void refreshAppliedQuote()

    return () => {
      cancelled = true
    }
  }, [appliedVoucherCode, eventId, quantity, selectedTierId])

  async function applyVoucherCode() {
    if (!voucherInput.trim()) {
      setAppliedVoucherCode(null)
      setAppliedQuote(null)
      setVoucherMessage("")
      return
    }

    setError("")
    setVoucherMessage("")
    setIsApplyingVoucher(true)

    const response = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        quantity,
        ticketTierId: selectedTierId || undefined,
        voucherCode: voucherInput,
      }),
    }).catch(() => null)

    if (!response) {
      setIsApplyingVoucher(false)
      setVoucherMessage("Network error while applying voucher.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.quote) {
      setIsApplyingVoucher(false)
      setAppliedVoucherCode(null)
      setAppliedQuote(null)
      setVoucherMessage(payload?.error || "Voucher code could not be applied.")
      return
    }

    setAppliedVoucherCode(payload.quote.voucher?.code || voucherInput.trim().toUpperCase())
    setVoucherInput(payload.quote.voucher?.code || voucherInput.trim().toUpperCase())
    setAppliedQuote(payload.quote as QuoteResponse)
    setIsApplyingVoucher(false)
    setVoucherMessage(
      payload.quote.voucher
        ? `${payload.quote.voucher.code} applied${payload.quote.voucher.discountLabel ? ` • ${payload.quote.voucher.discountLabel}` : ""}`
        : "Voucher applied.",
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (soldOut) {
      setError(selectedTier ? `${selectedTier.name} is sold out.` : "This event is sold out.")
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
        ticketTierId: selectedTierId || undefined,
        voucherCode: appliedVoucherCode || undefined,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {ticketTiers.length > 0 && (
        <div className="space-y-3">
          <Label>{"Ticket Tier"}</Label>
          <div className="grid gap-3">
            {ticketTiers.map((tier) => {
              const selected = tier.id === selectedTierId

              return (
                <button
                  key={tier.id}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    selected ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40"
                  }`}
                  onClick={() => {
                    setSelectedTierId(tier.id)
                    setError("")
                  }}
                  disabled={isSubmitting}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{tier.name}</div>
                      {tier.description && <div className="mt-1 text-sm text-muted-foreground">{tier.description}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{tier.priceLabel}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {tier.available > 0 ? `${tier.available} left` : "Sold out"}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

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
            {`Up to ${maxQuantity} ticket${maxQuantity === 1 ? "" : "s"} for this selection.`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="checkout-voucher">{"Voucher / Promo Code"}</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="checkout-voucher"
            value={voucherInput}
            onChange={(event) => {
              setVoucherInput(event.target.value)
              if (appliedVoucherCode && event.target.value.trim().toUpperCase() !== appliedVoucherCode) {
                setAppliedVoucherCode(null)
                setAppliedQuote(null)
                setVoucherMessage("")
              }
            }}
            placeholder="SPRING10"
            disabled={isSubmitting || soldOut}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary text-primary"
              disabled={isSubmitting || soldOut || isApplyingVoucher}
              onClick={() => void applyVoucherCode()}
            >
              {isApplyingVoucher ? "Applying..." : "Apply"}
            </Button>
            {appliedVoucherCode && (
              <Button
                type="button"
                variant="outline"
                className="border-border"
                onClick={() => {
                  setAppliedVoucherCode(null)
                  setAppliedQuote(null)
                  setVoucherInput("")
                  setVoucherMessage("")
                }}
                disabled={isSubmitting || isApplyingVoucher}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        {voucherMessage && <p className="text-xs text-muted-foreground">{voucherMessage}</p>}
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
          <span>{displayedPricing.selectedTier ? "Selected tier" : "Price per ticket"}</span>
          <span>
            {displayedPricing.selectedTier
              ? `${displayedPricing.selectedTier.name} • ${formatCurrency(displayedPricing.unitPriceCents, currency.toUpperCase())}`
              : formatCurrency(displayedPricing.unitPriceCents, currency.toUpperCase())}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{"Subtotal"}</span>
          <span>{formatCurrency(displayedPricing.subtotalCents, currency.toUpperCase())}</span>
        </div>
        {displayedPricing.discountAmountCents > 0 && (
          <div className="mt-3 flex items-center justify-between gap-4 text-sm text-emerald-700">
            <span>{displayedPricing.voucher ? `Discount (${displayedPricing.voucher.code})` : "Discount"}</span>
            <span>{`-${formatCurrency(displayedPricing.discountAmountCents, currency.toUpperCase())}`}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-4 text-base font-semibold">
          <span>{"Total"}</span>
          <span>{formatCurrency(displayedPricing.totalPriceCents, currency.toUpperCase())}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {"Your selected tickets are held for 30 minutes once Stripe Checkout opens."}
        </p>
      </div>

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm">{error}</div>}

      <Button
        type="submit"
        size="lg"
        className="w-full bg-primary text-primary-foreground hover:bg-accent"
        disabled={isSubmitting || soldOut || displayedPricing.totalPriceCents <= 0}
      >
        {soldOut ? "Sold Out" : isSubmitting ? "Opening Secure Checkout..." : "Continue to Secure Checkout"}
      </Button>
    </form>
  )
}
