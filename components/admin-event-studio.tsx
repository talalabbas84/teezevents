"use client"

import type { FormEvent } from "react"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Tags,
  TicketPercent,
  Trash2,
  UploadCloud,
} from "lucide-react"

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
  gallery: string[]
  previewDescription: string | null
  description: string | null
  contentSections: Array<{
    title: string
    body: string[]
  }>
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

type ContentSectionFormState = {
  localId: string
  title: string
  body: string
}

type EventFormState = {
  id: string
  title: string
  startsAt: string
  venue: string
  address: string
  hostedBy: string
  image: string
  gallery: string[]
  previewDescription: string
  description: string
  contentSections: ContentSectionFormState[]
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

function dateToDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function formatStudioDate(value: string | null) {
  if (!value) {
    return "Date TBA"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date TBA"
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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

function emptyContentSection(): ContentSectionFormState {
  return {
    localId: buildLocalId("section"),
    title: "",
    body: "",
  }
}

function splitSectionBody(value: string) {
  return value
    .split(/\n{2,}|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function testEventTemplate(): EventFormState {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(19, 0, 0, 0)

  const suffix = Date.now().toString(36)

  return {
    id: `test-event-${suffix}`,
    title: "Test Event",
    startsAt: dateToDateTimeLocal(start),
    venue: "Test Venue",
    address: "Toronto, ON",
    hostedBy: "TEEZ",
    image: "/placeholder.svg",
    gallery: [],
    previewDescription: "Internal test event for checkout, vouchers, tickets, and admin operations.",
    description:
      "This event is hidden from public event listings and public event detail pages. Use the direct checkout link from admin for testing.",
    contentSections: [],
    category: "UPCOMING",
    eventKind: "SOCIAL",
    ticketPriceCad: "1.00",
    capacity: "20",
    checkoutEnabled: true,
    maxTicketsPerOrder: "4",
    ticketNote: "Internal test event. Not shown on public-facing event pages.",
    featured: false,
    isActive: false,
    ticketTiers: [
      {
        ...emptyTier(0),
        name: "Test General Admission",
        description: "Low-value ticket tier for Stripe test checkout.",
        priceCad: "1.00",
        quantityLimit: "20",
        maxPerOrder: "4",
      },
    ],
    vouchers: [],
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

function generateVoucherCode() {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `TEEZ-${suffix}`.toUpperCase()
}

function oneTimeFixedVoucher(): VoucherFormState {
  return {
    ...emptyVoucher(),
    code: generateVoucherCode(),
    description: "One-time voucher",
    discountType: "FIXED",
    maxRedemptions: "1",
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
    gallery: event?.gallery || [],
    previewDescription: event?.previewDescription || "",
    description: event?.description || "",
    contentSections:
      event?.contentSections.map((section) => ({
        localId: buildLocalId("section"),
        title: section.title,
        body: section.body.join("\n"),
      })) || [],
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
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  async function uploadImages(files: FileList | File[], target: "hero" | "gallery") {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, target === "hero" ? 1 : 10)

    if (imageFiles.length === 0) {
      return
    }

    if (!cloudName || !uploadPreset) {
      setError("Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for drag-and-drop uploads.")
      return
    }

    setError("")
    setStatus("")
    setIsUploading(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of imageFiles) {
        const body = new FormData()
        body.append("file", file)
        body.append("upload_preset", uploadPreset)
        body.append("folder", `teez-events/${form.id || "draft"}`)

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok || typeof payload?.secure_url !== "string") {
          throw new Error(payload?.error?.message || "Cloudinary upload failed.")
        }

        uploadedUrls.push(payload.secure_url)
      }

      setForm((current) => {
        if (target === "hero") {
          return {
            ...current,
            image: uploadedUrls[0] || current.image,
            gallery: [...new Set([uploadedUrls[0], ...current.gallery].filter(Boolean))],
          }
        }

        return {
          ...current,
          gallery: [...new Set([...current.gallery, ...uploadedUrls])],
        }
      })
      setStatus(`Uploaded ${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} to Cloudinary.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  function handleSectionDrop(targetId: string) {
    if (!draggedSectionId || draggedSectionId === targetId) {
      return
    }

    setForm((current) => {
      const fromIndex = current.contentSections.findIndex((section) => section.localId === draggedSectionId)
      const toIndex = current.contentSections.findIndex((section) => section.localId === targetId)

      if (fromIndex < 0 || toIndex < 0) {
        return current
      }

      return {
        ...current,
        contentSections: moveItem(current.contentSections, fromIndex, toIndex),
      }
    })
    setDraggedSectionId(null)
  }

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
        gallery: form.gallery.filter(Boolean),
        previewDescription: form.previewDescription || undefined,
        description: form.description || undefined,
        contentSections: form.contentSections
          .map((section) => ({
            title: section.title,
            body: splitSectionBody(section.body),
          }))
          .filter((section) => section.title.trim() && section.body.length > 0),
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
                <Link href={`/admin/events/${form.id}`}>Operations</Link>
              </Button>
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

          {mode === "create" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-primary text-primary"
              onClick={() => {
                setForm(testEventTemplate())
                setError("")
                setStatus("Test event template loaded. Save it to create a hidden admin-only test event.")
              }}
              disabled={isSubmitting}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={14} />
                Create Test Event
              </span>
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Publishing & Placement
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Show publicly publishes this event to the website. Featured controls the homepage and events page
                  placement. Checkout enabled sends ticket buttons into the checkout flow.
                </p>
              </div>
              <div className="rounded-full border border-primary/25 bg-background px-4 py-2 text-sm font-semibold text-primary">
                {`${form.isActive ? "Public" : "Hidden"}${form.featured ? " - Featured" : ""}`}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                {
                  id: `${mode}-active`,
                  label: "Show publicly",
                  helper: "Adds the event to public event pages.",
                  checked: form.isActive,
                  onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, isActive: checked })),
                },
                {
                  id: `${mode}-featured`,
                  label: "Feature on website",
                  helper: "Prioritizes this event in featured placements.",
                  checked: form.featured,
                  onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, featured: checked })),
                },
                {
                  id: `${mode}-checkout-enabled`,
                  label: "Checkout enabled",
                  helper: "Uses live ticket inventory and payment checkout.",
                  checked: form.checkoutEnabled,
                  onCheckedChange: (checked: boolean) => setForm((current) => ({ ...current, checkoutEnabled: checked })),
                },
              ].map((toggle) => (
                <label
                  key={toggle.id}
                  htmlFor={toggle.id}
                  className="flex min-h-[116px] flex-col justify-between rounded-2xl border border-border bg-background/75 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold">{toggle.label}</span>
                    <Switch
                      id={toggle.id}
                      checked={toggle.checked}
                      onCheckedChange={toggle.onCheckedChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  <span className="mt-3 text-sm leading-relaxed text-muted-foreground">{toggle.helper}</span>
                </label>
              ))}
            </div>
          </div>

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
                disabled={isSubmitting || isUploading}
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div
              className="rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                void uploadImages(event.dataTransfer.files, "hero")
              }}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <UploadCloud size={20} />
                </div>
                <div className="space-y-2">
                  <div className="font-semibold">Drop Hero Image</div>
                  <p className="text-sm text-muted-foreground">
                    Uploads to Cloudinary and sets the hero image. The uploaded image is also added to the gallery.
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      if (event.target.files) {
                        void uploadImages(event.target.files, "hero")
                      }
                    }}
                    disabled={isSubmitting || isUploading}
                  />
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl border border-dashed border-border bg-muted/20 p-5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                void uploadImages(event.dataTransfer.files, "gallery")
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <ImagePlus size={16} className="text-primary" />
                    Gallery Images
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Drop multiple images or paste URLs below.</p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="max-w-xs"
                  onChange={(event) => {
                    if (event.target.files) {
                      void uploadImages(event.target.files, "gallery")
                    }
                  }}
                  disabled={isSubmitting || isUploading}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {form.gallery.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No gallery images yet.</div>
                ) : (
                  form.gallery.map((image) => (
                    <div key={image} className="flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs">
                      <span className="max-w-[220px] truncate">{image}</span>
                      <button
                        type="button"
                        className="font-semibold text-destructive"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            gallery: current.gallery.filter((item) => item !== image),
                          }))
                        }
                        disabled={isSubmitting || isUploading}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Textarea
                className="mt-4"
                value={form.gallery.join("\n")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gallery: event.target.value
                      .split(/\n|,/)
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Paste gallery image URLs, one per line."
                rows={3}
                disabled={isSubmitting || isUploading}
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

          <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <GripVertical size={16} />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Event Page Sections</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add reusable detail blocks for dress code, music, venue notes, sponsor copy, or VIP instructions. Drag sections to reorder them.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-primary text-primary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    contentSections: [...current.contentSections, emptyContentSection()],
                  }))
                }
                disabled={isSubmitting}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={14} />
                  Add Section
                </span>
              </Button>
            </div>

            {form.contentSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No custom sections yet. The event detail page will use the description, gallery, ticket panel, and any catalog defaults.
              </div>
            ) : (
              <div className="space-y-4">
                {form.contentSections.map((section, index) => (
                  <div
                    key={section.localId}
                    draggable
                    onDragStart={() => setDraggedSectionId(section.localId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleSectionDrop(section.localId)}
                    className="rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <GripVertical size={16} className="text-muted-foreground" />
                        {section.title || `Section ${index + 1}`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              contentSections:
                                index > 0 ? moveItem(current.contentSections, index, index - 1) : current.contentSections,
                            }))
                          }
                          disabled={isSubmitting || index === 0}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              contentSections:
                                index < current.contentSections.length - 1
                                  ? moveItem(current.contentSections, index, index + 1)
                                  : current.contentSections,
                            }))
                          }
                          disabled={isSubmitting || index === form.contentSections.length - 1}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-destructive text-destructive"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              contentSections: current.contentSections.filter((item) => item.localId !== section.localId),
                            }))
                          }
                          disabled={isSubmitting}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                      <div className="space-y-2">
                        <Label>{`Section Title`}</Label>
                        <Input
                          value={section.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              contentSections: current.contentSections.map((item) =>
                                item.localId === section.localId ? { ...item, title: event.target.value } : item,
                              ),
                            }))
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{`Body`}</Label>
                        <Textarea
                          value={section.body}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              contentSections: current.contentSections.map((item) =>
                                item.localId === section.localId ? { ...item, body: event.target.value } : item,
                              ),
                            }))
                          }
                          placeholder="Use one paragraph per line."
                          rows={4}
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

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary text-primary"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      vouchers: [...current.vouchers, oneTimeFixedVoucher()],
                    }))
                  }
                  disabled={isSubmitting}
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles size={14} />
                    Generate One-Time
                  </span>
                </Button>
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
  const createEventId = "__create__"
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || createEventId)
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null
  const isCreating = selectedEventId === createEventId || !selectedEvent

  return (
    <div className="space-y-8">
      <Card className="border border-border shadow-xl">
        <CardContent className="space-y-5 p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                <Sparkles size={16} />
                Event Workspace
              </div>
              <h2 className="mt-2 text-3xl font-serif font-bold">
                {isCreating ? "Create one event" : selectedEvent.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick an event from the dropdown. Only that event opens below.
              </p>
            </div>

            <Button
              type="button"
              variant={isCreating ? "default" : "outline"}
              className={isCreating ? "bg-primary text-primary-foreground hover:bg-accent" : "border-primary text-primary"}
              onClick={() => setSelectedEventId(createEventId)}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                New Event
              </span>
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="event-studio-selected-event">Current Event</Label>
              <select
                id="event-studio-selected-event"
                value={isCreating ? createEventId : selectedEvent.id}
                onChange={(event) => setSelectedEventId(event.target.value)}
                className="w-full rounded-md border-2 border-input bg-background px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={createEventId}>Create a new event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {`${event.title} - ${formatStudioDate(event.startsAt)} - ${event.isActive ? "Public" : "Hidden"}${
                      event.featured ? " - Featured" : ""
                    }`}
                  </option>
                ))}
              </select>
            </div>

            {!isCreating && selectedEvent ? (
              <div className="grid min-w-[280px] grid-cols-3 gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Issued</div>
                  <div className="mt-1 text-xl font-serif font-bold">{selectedEvent.ticketsIssued}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Left</div>
                  <div className="mt-1 text-xl font-serif font-bold">{selectedEvent.spotsLeft}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Revenue</div>
                  <div className="mt-1 text-xl font-serif font-bold">{formatCurrency(selectedEvent.revenueCents)}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-muted-foreground">
                Start with the required fields, then add ticket tiers, page sections, and images.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isCreating ? (
        <EventEditorCard key="create-event" mode="create" />
      ) : (
        <EventEditorCard key={selectedEvent.id} initialEvent={selectedEvent} mode="edit" />
      )}

    </div>
  )
}
