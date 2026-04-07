"use client"

import type { FormEvent } from "react"

import Link from "next/link"
import { useState } from "react"
import { CalendarDays, Loader2, Plus, Sparkles, Tags, TicketPercent, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type AdminManagedTierView = {
  id: string
  name: string
  description: string | null
  priceCents: number
  quantityLimit: number | null
  maxPerOrder: number | null
  sortOrder: number
  isActive: boolean
  isHidden: boolean
  soldCount: number
  reservedCount: number
  spotsLeft: number | null
  revenueCents: number
}

type AdminManagedVoucherView = {
  id: string
  code: string
  description: string | null
  discountType: "FIXED" | "PERCENT"
  amountOffCents: number | null
  percentOff: number | null
  minimumQuantity: number | null
  maxRedemptions: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  redemptionCount: number
  discountCents: number
}

type AdminManagedEventView = {
  id: string
  title: string
  startsAt: string | null
  venue: string | null
  address: string | null
  hostedBy: string | null
  image: string | null
  previewDescription: string | null
  description: string | null
  category: "UPCOMING" | "PAST"
  eventKind: "THEMED" | "SIGNATURE" | "CORPORATE" | "SOCIAL"
  ticketPriceCents: number
  capacity: number
  checkoutEnabled: boolean
  maxTicketsPerOrder: number
  ticketNote: string | null
  featured: boolean
  isActive: boolean
  paidOrders: number
  ticketsIssued: number
  checkedInCount: number
  reservedTickets: number
  spotsLeft: number
  revenueCents: number
  ticketTiers: AdminManagedTierView[]
  vouchers: AdminManagedVoucherView[]
}

type TierFormState = {
  localId: string
  id?: string
  name: string
  description: string
  priceCad: string
  quantityLimit: string
  maxPerOrder: string
  sortOrder: string
  isActive: boolean
  isHidden: boolean
  soldCount?: number
  reservedCount?: number
  spotsLeft?: number | null
  revenueCents?: number
}

type VoucherFormState = {
  localId: string
  id?: string
  code: string
  description: string
  discountType: "FIXED" | "PERCENT"
  amountValue: string
  minimumQuantity: string
  maxRedemptions: string
  startsAt: string
  expiresAt: string
  isActive: boolean
  redemptionCount?: number
  discountCents?: number
}

type EventFormState = {
  id: string
  title: string
  startsAt: string
  venue: string
  address: string
  hostedBy: string
  image: string
  previewDescription: string
  description: string
  category: "UPCOMING" | "PAST"
  eventKind: "THEMED" | "SIGNATURE" | "CORPORATE" | "SOCIAL"
  ticketPriceCad: string
  capacity: string
  checkoutEnabled: boolean
  maxTicketsPerOrder: string
  ticketNote: string
  featured: boolean
  isActive: boolean
  ticketTiers: TierFormState[]
  vouchers: VoucherFormState[]
}

function buildLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100)
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function emptyTier(sortOrder = 0): TierFormState {
  return {
    localId: buildLocalId("tier"),
    name: "",
    description: "",
    priceCad: "",
    quantityLimit: "",
    maxPerOrder: "",
    sortOrder: String(sortOrder),
    isActive: true,
    isHidden: false,
  }
}

function emptyVoucher(): VoucherFormState {
  return {
    localId: buildLocalId("voucher"),
    code: "",
    description: "",
    discountType: "PERCENT",
    amountValue: "",
    minimumQuantity: "",
    maxRedemptions: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
  }
}

function fromEvent(event?: AdminManagedEventView | null): EventFormState {
  return {
    id: event?.id || "",
    title: event?.title || "",
    startsAt: toDateTimeLocal(event?.startsAt || null),
    venue: event?.venue || "",
    address: event?.address || "",
    hostedBy: event?.hostedBy || "",
    image: event?.image || "",
    previewDescription: event?.previewDescription || "",
    description: event?.description || "",
    category: event?.category || "UPCOMING",
    eventKind: event?.eventKind || "SOCIAL",
    ticketPriceCad: ((event?.ticketPriceCents || 0) / 100).toFixed(2),
    capacity: String(event?.capacity || 80),
    checkoutEnabled: event?.checkoutEnabled ?? true,
    maxTicketsPerOrder: String(event?.maxTicketsPerOrder || event?.capacity || 80),
    ticketNote: event?.ticketNote || "",
    featured: event?.featured ?? false,
    isActive: event?.isActive ?? true,
    ticketTiers:
      event?.ticketTiers.map((tier) => ({
        localId: buildLocalId("tier"),
        id: tier.id,
        name: tier.name,
        description: tier.description || "",
        priceCad: (tier.priceCents / 100).toFixed(2),
        quantityLimit: tier.quantityLimit ? String(tier.quantityLimit) : "",
        maxPerOrder: tier.maxPerOrder ? String(tier.maxPerOrder) : "",
        sortOrder: String(tier.sortOrder),
        isActive: tier.isActive,
        isHidden: tier.isHidden,
        soldCount: tier.soldCount,
        reservedCount: tier.reservedCount,
        spotsLeft: tier.spotsLeft,
        revenueCents: tier.revenueCents,
      })) || [],
    vouchers:
      event?.vouchers.map((voucher) => ({
        localId: buildLocalId("voucher"),
        id: voucher.id,
        code: voucher.code,
        description: voucher.description || "",
        discountType: voucher.discountType,
        amountValue:
          voucher.discountType === "FIXED"
            ? ((voucher.amountOffCents || 0) / 100).toFixed(2)
            : String(voucher.percentOff || 0),
        minimumQuantity: voucher.minimumQuantity ? String(voucher.minimumQuantity) : "",
        maxRedemptions: voucher.maxRedemptions ? String(voucher.maxRedemptions) : "",
        startsAt: toDateTimeLocal(voucher.startsAt),
        expiresAt: toDateTimeLocal(voucher.expiresAt),
        isActive: voucher.isActive,
        redemptionCount: voucher.redemptionCount,
        discountCents: voucher.discountCents,
      })) || [],
  }
}

function EventEditorCard({
  initialEvent,
  mode,
}: {
  initialEvent?: AdminManagedEventView | null
  mode: "create" | "edit"
}) {
  const [form, setForm] = useState<EventFormState>(fromEvent(initialEvent))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setStatus("")
    setIsSubmitting(true)

    const response = await fetch("/api/admin/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: form.id,
        title: form.title,
        startsAt: form.startsAt || undefined,
        venue: form.venue || undefined,
        address: form.address || undefined,
        hostedBy: form.hostedBy || undefined,
        image: form.image || undefined,
        previewDescription: form.previewDescription || undefined,
        description: form.description || undefined,
        category: form.category,
        eventKind: form.eventKind,
        ticketPriceCad: Number(form.ticketPriceCad) || 0,
        capacity: Math.max(1, Number(form.capacity) || 1),
        checkoutEnabled: form.checkoutEnabled,
        maxTicketsPerOrder: Math.max(1, Number(form.maxTicketsPerOrder) || 1),
        ticketNote: form.ticketNote || undefined,
        featured: form.featured,
        isActive: form.isActive,
        ticketTiers: form.ticketTiers
          .filter((tier) => tier.name.trim())
          .map((tier, index) => ({
            id: tier.id,
            name: tier.name,
            description: tier.description || undefined,
            priceCad: Number(tier.priceCad) || 0,
            quantityLimit: tier.quantityLimit ? Math.max(1, Number(tier.quantityLimit)) : undefined,
            maxPerOrder: tier.maxPerOrder ? Math.max(1, Number(tier.maxPerOrder)) : undefined,
            sortOrder: Number.isFinite(Number(tier.sortOrder)) ? Number(tier.sortOrder) : index,
            isActive: tier.isActive,
            isHidden: tier.isHidden,
          })),
        vouchers: form.vouchers
          .filter((voucher) => voucher.code.trim())
          .map((voucher) => ({
            id: voucher.id,
            code: voucher.code,
            description: voucher.description || undefined,
            discountType: voucher.discountType,
            amountCadOff:
              voucher.discountType === "FIXED" && voucher.amountValue ? Math.max(0, Number(voucher.amountValue)) : undefined,
            percentOff:
              voucher.discountType === "PERCENT" && voucher.amountValue ? Math.max(1, Number(voucher.amountValue)) : undefined,
            minimumQuantity: voucher.minimumQuantity ? Math.max(1, Number(voucher.minimumQuantity)) : undefined,
            maxRedemptions: voucher.maxRedemptions ? Math.max(1, Number(voucher.maxRedemptions)) : undefined,
            startsAt: voucher.startsAt || undefined,
            expiresAt: voucher.expiresAt || undefined,
            isActive: voucher.isActive,
          })),
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
      setError(payload?.error || "Unable to save event.")
      return
    }

    setStatus(mode === "create" ? "Event created. Reloading studio..." : "Event saved. Reloading studio...")
    window.location.reload()
  }

  async function handleDelete() {
    if (!form.id || isDeleting) {
      return
    }

    const confirmed = window.confirm(
      "Delete this event from active operations? Events with orders or catalog entries will be archived instead of hard-deleted.",
    )

    if (!confirmed) {
      return
    }

    setError("")
    setStatus("")
    setIsDeleting(true)

    const response = await fetch(`/api/admin/events?id=${encodeURIComponent(form.id)}`, {
      method: "DELETE",
    }).catch(() => null)

    if (!response) {
      setIsDeleting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      setIsDeleting(false)
      setError(payload?.error || "Unable to delete event.")
      return
    }

    setStatus(payload.mode === "archived" ? "Event archived. Reloading studio..." : "Event deleted. Reloading studio...")
    window.location.reload()
  }

  return (
    <Card className="border border-border shadow-xl">
      <CardContent className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              {mode === "create" ? "New Event" : "Live Event Settings"}
            </div>
            <h2 className="mt-2 text-2xl font-serif font-bold">
              {mode === "create" ? "Create a dynamic event" : form.title || form.id}
            </h2>
            {initialEvent && mode === "edit" && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{`${initialEvent.ticketsIssued} issued`}</span>
                <span>{`${initialEvent.spotsLeft} left`}</span>
                <span>{`${initialEvent.paidOrders} paid orders`}</span>
                <span>{formatCurrency(initialEvent.revenueCents)}</span>
              </div>
            )}
          </div>

          {mode === "edit" && form.id && (
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                <Link href={`/events/${form.id}`}>View Event</Link>
              </Button>
              {form.checkoutEnabled && (
                <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                  <Link href={`/checkout/${form.id}`}>Open Checkout</Link>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive text-destructive"
                onClick={() => void handleDelete()}
                disabled={isDeleting || isSubmitting}
              >
                <span className="inline-flex items-center gap-2">
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete / Archive
                </span>
              </Button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-event-id`}>Event ID</Label>
              <Input
                id={`${mode}-event-id`}
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="blossom"
                disabled={isSubmitting || mode === "edit"}
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor={`${mode}-event-title`}>Title</Label>
              <Input
                id={`${mode}-event-title`}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="BLOSSOM"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-starts-at`}>Start Time</Label>
              <Input
                id={`${mode}-starts-at`}
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-venue`}>Venue</Label>
              <Input
                id={`${mode}-venue`}
                value={form.venue}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
                placeholder="Party Room - 2nd floor"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor={`${mode}-address`}>Address / Public Location</Label>
              <Input
                id={`${mode}-address`}
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="1001 Bay St, Toronto ON"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-hosted-by`}>Hosted By</Label>
              <Input
                id={`${mode}-hosted-by`}
                value={form.hostedBy}
                onChange={(event) => setForm((current) => ({ ...current, hostedBy: event.target.value }))}
                placeholder="TEEZ"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-category`}>Category</Label>
              <select
                id={`${mode}-category`}
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value as EventFormState["category"] }))
                }
                className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isSubmitting}
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="PAST">Past</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-kind`}>Type</Label>
              <select
                id={`${mode}-kind`}
                value={form.eventKind}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventKind: event.target.value as EventFormState["eventKind"] }))
                }
                className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isSubmitting}
              >
                <option value="SOCIAL">Social</option>
                <option value="SIGNATURE">Signature</option>
                <option value="THEMED">Themed</option>
                <option value="CORPORATE">Corporate</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-image`}>Hero Image</Label>
              <Input
                id={`${mode}-image`}
                value={form.image}
                onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                placeholder="/images/event-hero.jpg"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-preview`}>Preview Description</Label>
            <Textarea
              id={`${mode}-preview`}
              value={form.previewDescription}
              onChange={(event) => setForm((current) => ({ ...current, previewDescription: event.target.value }))}
              placeholder="Short listing summary for cards and checkout."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-description`}>Full Description</Label>
            <Textarea
              id={`${mode}-description`}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Long-form event description."
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-price`}>Base / Lowest Ticket Price (CAD)</Label>
              <Input
                id={`${mode}-price`}
                type="number"
                min={0}
                step="0.01"
                value={form.ticketPriceCad}
                onChange={(event) => setForm((current) => ({ ...current, ticketPriceCad: event.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-capacity`}>Capacity</Label>
              <Input
                id={`${mode}-capacity`}
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-max-order`}>Max Tickets / Order</Label>
              <Input
                id={`${mode}-max-order`}
                type="number"
                min={1}
                max={20}
                value={form.maxTicketsPerOrder}
                onChange={(event) => setForm((current) => ({ ...current, maxTicketsPerOrder: event.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-ticket-note`}>Ticket Note</Label>
              <Input
                id={`${mode}-ticket-note`}
                value={form.ticketNote}
                onChange={(event) => setForm((current) => ({ ...current, ticketNote: event.target.value }))}
                placeholder="Ticketing note shown on event pages"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-muted/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Tags size={16} />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Ticket Tiers</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add early bird, VIP, last call, or invite-only tiers. The lowest active price becomes the public starting price.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="border-primary text-primary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    ticketTiers: [...current.ticketTiers, emptyTier(current.ticketTiers.length)],
                  }))
                }
                disabled={isSubmitting}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={14} />
                  Add Tier
                </span>
              </Button>
            </div>

            {form.ticketTiers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                No tiers yet. The base price above will be used for checkout until you add them.
              </div>
            ) : (
              <div className="space-y-4">
                {form.ticketTiers.map((tier, index) => (
                  <div key={tier.localId} className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{tier.name || `Tier ${index + 1}`}</div>
                        {(tier.soldCount !== undefined || tier.revenueCents !== undefined) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {`${tier.soldCount || 0} sold • ${tier.reservedCount || 0} reserved`}
                            {typeof tier.spotsLeft === "number" ? ` • ${tier.spotsLeft} left` : ""}
                            {tier.revenueCents ? ` • ${formatCurrency(tier.revenueCents)}` : ""}
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            ticketTiers: current.ticketTiers.filter((item) => item.localId !== tier.localId),
                          }))
                        }
                        disabled={isSubmitting}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>{`Tier Name`}</Label>
                        <Input
                          value={tier.name}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, name: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Price (CAD)`}</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={tier.priceCad}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, priceCad: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Tier Cap`}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tier.quantityLimit}
                          placeholder="Optional"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, quantityLimit: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Max / Order`}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tier.maxPerOrder}
                          placeholder="Optional"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, maxPerOrder: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
                      <div className="space-y-2">
                        <Label>{`Description`}</Label>
                        <Input
                          value={tier.description}
                          placeholder="Optional buyer-facing description"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, description: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Sort Order`}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={tier.sortOrder}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, sortOrder: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                        <span className="text-sm font-medium">Active</span>
                        <Switch
                          checked={tier.isActive}
                          onCheckedChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, isActive: checked } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                        <span className="text-sm font-medium">Hidden</span>
                        <Switch
                          checked={tier.isHidden}
                          onCheckedChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              ticketTiers: current.ticketTiers.map((item) =>
                                item.localId === tier.localId ? { ...item, isHidden: checked } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-muted/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <TicketPercent size={16} />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Discount Vouchers</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create event-specific promo codes with percent or fixed discounts, redemption caps, and live windows.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="border-primary text-primary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    vouchers: [...current.vouchers, emptyVoucher()],
                  }))
                }
                disabled={isSubmitting}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={14} />
                  Add Voucher
                </span>
              </Button>
            </div>

            {form.vouchers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                No promo codes yet. Buyers can still check out at full price.
              </div>
            ) : (
              <div className="space-y-4">
                {form.vouchers.map((voucher) => (
                  <div key={voucher.localId} className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{voucher.code || "New voucher"}</div>
                        {(voucher.redemptionCount !== undefined || voucher.discountCents !== undefined) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {`${voucher.redemptionCount || 0} redemptions`}
                            {voucher.discountCents ? ` • ${formatCurrency(voucher.discountCents)} discounted` : ""}
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            vouchers: current.vouchers.filter((item) => item.localId !== voucher.localId),
                          }))
                        }
                        disabled={isSubmitting}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>{`Code`}</Label>
                        <Input
                          value={voucher.code}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, code: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Type`}</Label>
                        <select
                          value={voucher.discountType}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId
                                  ? { ...item, discountType: event.target.value as VoucherFormState["discountType"] }
                                  : item,
                              ),
                            }))
                          }
                          className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                          disabled={isSubmitting}
                        >
                          <option value="PERCENT">Percent</option>
                          <option value="FIXED">Fixed CAD</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{voucher.discountType === "FIXED" ? "Amount Off (CAD)" : "Percent Off"}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={voucher.discountType === "FIXED" ? "0.01" : "1"}
                          value={voucher.amountValue}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, amountValue: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                        <span className="text-sm font-medium">Active</span>
                        <Switch
                          checked={voucher.isActive}
                          onCheckedChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, isActive: checked } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>{`Description`}</Label>
                        <Input
                          value={voucher.description}
                          placeholder="Optional internal note"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, description: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Minimum Quantity`}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={voucher.minimumQuantity}
                          placeholder="Optional"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, minimumQuantity: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Max Redemptions`}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={voucher.maxRedemptions}
                          placeholder="Optional"
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, maxRedemptions: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{`Starts At`}</Label>
                        <Input
                          type="datetime-local"
                          value={voucher.startsAt}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, startsAt: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Expires At`}</Label>
                        <Input
                          type="datetime-local"
                          value={voucher.expiresAt}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              vouchers: current.vouchers.map((item) =>
                                item.localId === voucher.localId ? { ...item, expiresAt: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                id: `${mode}-checkout-enabled`,
                label: "Checkout enabled",
                checked: form.checkoutEnabled,
                onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, checkoutEnabled: checked })),
              },
              {
                id: `${mode}-featured`,
                label: "Featured event",
                checked: form.featured,
                onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, featured: checked })),
              },
              {
                id: `${mode}-active`,
                label: "Publicly active",
                checked: form.isActive,
                onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, isActive: checked })),
              },
            ].map((toggle) => (
              <label
                key={toggle.id}
                htmlFor={toggle.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3"
              >
                <span className="text-sm font-medium">{toggle.label}</span>
                <Switch
                  id={toggle.id}
                  checked={toggle.checked}
                  onCheckedChange={toggle.onCheckedChange}
                  disabled={isSubmitting}
                />
              </label>
            ))}

            <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
              Lowering capacity below sold or reserved inventory is blocked automatically. Deleting a catalog-backed or sold event archives it instead.
            </div>
          </div>

          {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
          {status && <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-primary">{status}</div>}

          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-accent" disabled={isSubmitting || isDeleting}>
            <span className="inline-flex items-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
              {mode === "create" ? "Create Event" : "Save Event"}
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function AdminEventStudio({ events }: { events: AdminManagedEventView[] }) {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Sparkles size={16} className="text-primary" />
          Dynamic event operations
        </div>
        <div className="mt-2">
          Pricing, tiering, voucher campaigns, visibility, and event retirement all route through the database from here.
        </div>
      </div>

      <EventEditorCard mode="create" />

      <div className="grid gap-8">
        {events.map((event) => (
          <EventEditorCard key={event.id} initialEvent={event} mode="edit" />
        ))}
      </div>
    </div>
  )
}
