"use client"

import type { FormEvent } from "react"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Tags,
  TicketPercent,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

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

export type AdminManagedEventView = {
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
  tags: string[]
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
  tags: string
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

function splitTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 24)
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
    tags: "internal, test",
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
    tags: event?.tags.join(", ") || "",
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

// ─── IMAGE CROP MODAL ────────────────────────────────────────────────────────

type CropBox = { x: number; y: number; w: number; h: number } // pixels in display space
type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null

type ImgBox = { left: number; top: number; width: number; height: number }

function clampCrop(box: CropBox, bounds: ImgBox, minSize = 50): CropBox {
  const w = Math.max(minSize, Math.min(box.w, bounds.width))
  const h = Math.max(minSize, Math.min(box.h, bounds.height))
  const x = Math.max(0, Math.min(box.x, bounds.width - w))
  const y = Math.max(0, Math.min(box.y, bounds.height - h))
  return { x, y, w, h }
}

const ASPECT_RATIOS = [
  { label: "16 : 9", value: 16 / 9 },
  { label: "4 : 3", value: 4 / 3 },
  { label: "1 : 1", value: 1 },
  { label: "Free", value: null as number | null },
]

function ImageCropModal({
  file,
  folder,
  onUpload,
  onCancel,
}: {
  file: File
  folder: string
  onUpload: (url: string) => void
  onCancel: () => void
}) {
  const [imgSrc, setImgSrc] = useState("")
  const [imgBox, setImgBox] = useState<ImgBox | null>(null)
  const [crop, setCrop] = useState<CropBox>({ x: 20, y: 20, w: 200, h: 120 })
  const [aspectRatio, setAspectRatio] = useState<number | null>(16 / 9)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragStart, setDragStart] = useState<{
    mouseX: number
    mouseY: number
    box: CropBox
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function measureImgBox() {
    if (!imgRef.current || !containerRef.current) return null
    const imgRect = imgRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const box: ImgBox = {
      left: imgRect.left - containerRect.left,
      top: imgRect.top - containerRect.top,
      width: imgRect.width,
      height: imgRect.height,
    }
    setImgBox(box)
    return box
  }

  function handleImageLoad() {
    const box = measureImgBox()
    if (!box || !imgRef.current) return
    const img = imgRef.current
    // Init crop: 80% of image width, aspect ratio enforced
    const cropW = box.width * 0.8
    const cropH = aspectRatio ? cropW / aspectRatio : box.height * 0.8
    const cropX = (box.width - cropW) / 2
    const cropY = (box.height - cropH) / 2
    setCrop({ x: cropX, y: cropY, w: cropW, h: Math.min(cropH, box.height * 0.9) })
    void img
  }

  function startDrag(e: React.MouseEvent, mode: NonNullable<DragMode>) {
    e.preventDefault()
    e.stopPropagation()
    setDragMode(mode)
    setDragStart({ mouseX: e.clientX, mouseY: e.clientY, box: { ...crop } })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragMode || !dragStart || !imgBox) return
      e.preventDefault()
      const dxPx = e.clientX - dragStart.mouseX
      const dyPx = e.clientY - dragStart.mouseY
      let box = { ...dragStart.box }

      if (dragMode === "move") {
        box.x += dxPx
        box.y += dyPx
      } else if (dragMode === "se") {
        box.w = Math.max(50, box.w + dxPx)
        box.h = Math.max(50, box.h + dyPx)
      } else if (dragMode === "sw") {
        box.x += dxPx
        box.w = Math.max(50, box.w - dxPx)
        box.h = Math.max(50, box.h + dyPx)
      } else if (dragMode === "ne") {
        const prevBottom = box.y + box.h
        box.y += dyPx
        box.w = Math.max(50, box.w + dxPx)
        box.h = Math.max(50, prevBottom - box.y)
      } else if (dragMode === "nw") {
        const prevRight = box.x + box.w
        const prevBottom = box.y + box.h
        box.x += dxPx
        box.y += dyPx
        box.w = Math.max(50, prevRight - box.x)
        box.h = Math.max(50, prevBottom - box.y)
      }

      if (aspectRatio && dragMode !== "move") {
        box.h = box.w / aspectRatio
        if (dragMode === "nw" || dragMode === "ne") {
          box.y = dragStart.box.y + dragStart.box.h - box.h
        }
      }

      setCrop(clampCrop(box, imgBox))
    },
    [dragMode, dragStart, aspectRatio, imgBox],
  )

  const handleMouseUp = useCallback(() => {
    setDragMode(null)
    setDragStart(null)
  }, [])

  useEffect(() => {
    if (!dragMode) return
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragMode, handleMouseMove, handleMouseUp])

  async function handleCropAndUpload() {
    if (!imgRef.current || !imgBox) return

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    setUploadError("")
    setIsUploading(true)

    try {
      const img = imgRef.current
      const scaleX = img.naturalWidth / imgBox.width
      const scaleY = img.naturalHeight / imgBox.height

      const pixX = Math.round(crop.x * scaleX)
      const pixY = Math.round(crop.y * scaleY)
      const pixW = Math.round(crop.w * scaleX)
      const pixH = Math.round(crop.h * scaleY)

      const outW = Math.min(pixW, 1920)
      const outH = Math.round(pixH * (outW / pixW))

      const canvas = document.createElement("canvas")
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not available.")
      ctx.drawImage(img, pixX, pixY, pixW, pixH, 0, 0, outW, outH)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
      if (!blob) throw new Error("Failed to generate cropped image.")

      if (!cloudName || !uploadPreset) {
        const localUrl = URL.createObjectURL(blob)
        onUpload(localUrl)
        return
      }

      const body = new FormData()
      body.append("file", blob, "cropped.jpg")
      body.append("upload_preset", uploadPreset)
      body.append("folder", folder)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body,
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || typeof payload?.secure_url !== "string") {
        throw new Error(payload?.error?.message || "Cloudinary upload failed.")
      }

      onUpload(payload.secure_url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.")
      setIsUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isUploading) onCancel() }}>
      <DialogContent className="max-w-3xl gap-0 p-0" showCloseButton={false}>
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Crop Image</DialogTitle>
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {/* Aspect ratio selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ratio:</span>
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setAspectRatio(r.value)}
                className={`rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors ${
                  aspectRatio === r.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Crop area */}
          <div
            ref={containerRef}
            className="relative select-none overflow-hidden rounded-xl bg-black"
            style={{ userSelect: "none" }}
          >
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop preview"
                className="block max-h-[55vh] w-full object-contain"
                draggable={false}
                onLoad={handleImageLoad}
              />
            )}

            {imgBox && (
              <>
                {/* Dark mask with cutout via box-shadow */}
                <div
                  className="pointer-events-none absolute overflow-hidden"
                  style={{
                    left: imgBox.left,
                    top: imgBox.top,
                    width: imgBox.width,
                    height: imgBox.height,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.w,
                      height: crop.h,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                    }}
                  />
                </div>

                {/* Interactive crop box */}
                <div
                  className="absolute"
                  style={{
                    left: imgBox.left + crop.x,
                    top: imgBox.top + crop.y,
                    width: crop.w,
                    height: crop.h,
                    border: "2px solid rgba(255,255,255,0.9)",
                    cursor: dragMode === "move" ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => startDrag(e, "move")}
                >
                  {/* Rule-of-thirds grid */}
                  <div className="pointer-events-none absolute inset-0">
                    {[33.33, 66.66].map((p) => (
                      <div
                        key={`v${p}`}
                        className="absolute bottom-0 top-0 border-r border-white/25"
                        style={{ left: `${p}%` }}
                      />
                    ))}
                    {[33.33, 66.66].map((p) => (
                      <div
                        key={`h${p}`}
                        className="absolute left-0 right-0 border-b border-white/25"
                        style={{ top: `${p}%` }}
                      />
                    ))}
                  </div>

                  {/* Corner handles */}
                  {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                    <div
                      key={corner}
                      className="absolute h-3 w-3 rounded-sm bg-white shadow-md"
                      style={{
                        top: corner.startsWith("n") ? -6 : undefined,
                        bottom: corner.startsWith("s") ? -6 : undefined,
                        left: corner.endsWith("w") ? -6 : undefined,
                        right: corner.endsWith("e") ? -6 : undefined,
                        cursor: `${corner}-resize`,
                      }}
                      onMouseDown={(e) => startDrag(e, corner)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {uploadError}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleCropAndUpload()}
            disabled={isUploading || !imgSrc}
            className="bg-primary text-primary-foreground hover:bg-accent"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UploadCloud size={14} />
                Crop & Upload
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EVENT EDITOR CARD ───────────────────────────────────────────────────────

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error"

export function EventEditorCard({
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [pendingHeroCropFile, setPendingHeroCropFile] = useState<File | null>(null)

  const formRef = useRef(form)
  formRef.current = form

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // Auto-save for edit mode
  useEffect(() => {
    if (mode !== "edit") return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    setSaveStatus("dirty")
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => void saveEvent(false), 1500)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear "saved" status after 3s
  useEffect(() => {
    if (saveStatus !== "saved") return
    const timer = setTimeout(() => setSaveStatus("idle"), 3000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const saveEvent = useCallback(
    async (shouldReload: boolean) => {
      const currentForm = formRef.current
      setSaveStatus("saving")
      setError("")
      if (shouldReload) setIsSubmitting(true)

      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentForm.id,
          title: currentForm.title,
          startsAt: currentForm.startsAt || undefined,
          venue: currentForm.venue || undefined,
          address: currentForm.address || undefined,
          hostedBy: currentForm.hostedBy || undefined,
          image: currentForm.image || undefined,
          gallery: currentForm.gallery.filter(Boolean),
          previewDescription: currentForm.previewDescription || undefined,
          description: currentForm.description || undefined,
          contentSections: currentForm.contentSections
            .map((s) => ({ title: s.title, body: splitSectionBody(s.body) }))
            .filter((s) => s.title.trim() && s.body.length > 0),
          tags: splitTags(currentForm.tags),
          category: currentForm.category,
          eventKind: currentForm.eventKind,
          ticketPriceCad: Number(currentForm.ticketPriceCad) || 0,
          capacity: Math.max(1, Number(currentForm.capacity) || 1),
          checkoutEnabled: currentForm.checkoutEnabled,
          maxTicketsPerOrder: Math.max(1, Number(currentForm.maxTicketsPerOrder) || 1),
          ticketNote: currentForm.ticketNote || undefined,
          featured: currentForm.featured,
          isActive: currentForm.isActive,
          ticketTiers: currentForm.ticketTiers
            .filter((t) => t.name.trim())
            .map((t, i) => ({
              id: t.id,
              name: t.name,
              description: t.description || undefined,
              priceCad: Number(t.priceCad) || 0,
              quantityLimit: t.quantityLimit ? Math.max(1, Number(t.quantityLimit)) : undefined,
              maxPerOrder: t.maxPerOrder ? Math.max(1, Number(t.maxPerOrder)) : undefined,
              sortOrder: Number.isFinite(Number(t.sortOrder)) ? Number(t.sortOrder) : i,
              isActive: t.isActive,
              isHidden: t.isHidden,
            })),
          vouchers: currentForm.vouchers
            .filter((v) => v.code.trim())
            .map((v) => ({
              id: v.id,
              code: v.code,
              description: v.description || undefined,
              discountType: v.discountType,
              amountCadOff:
                v.discountType === "FIXED" && v.amountValue ? Math.max(0, Number(v.amountValue)) : undefined,
              percentOff:
                v.discountType === "PERCENT" && v.amountValue ? Math.max(1, Number(v.amountValue)) : undefined,
              minimumQuantity: v.minimumQuantity ? Math.max(1, Number(v.minimumQuantity)) : undefined,
              maxRedemptions: v.maxRedemptions ? Math.max(1, Number(v.maxRedemptions)) : undefined,
              startsAt: v.startsAt || undefined,
              expiresAt: v.expiresAt || undefined,
              isActive: v.isActive,
            })),
        }),
      }).catch(() => null)

      if (!response) {
        setSaveStatus("error")
        if (shouldReload) {
          setIsSubmitting(false)
          setError("Network error. Please try again.")
        }
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.ok) {
        setSaveStatus("error")
        if (shouldReload) {
          setIsSubmitting(false)
          setError(payload?.error || "Unable to save event.")
        }
        return
      }

      setSaveStatus("saved")

      if (shouldReload) {
        setStatus(mode === "create" ? "Event created. Reloading studio..." : "Event saved. Reloading studio...")
        window.location.reload()
      }
    },
    [mode],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveEvent(true)
  }

  async function handleDelete() {
    if (!form.id || isDeleting) return

    const confirmed = window.confirm(
      "Delete this event from active operations? Events with orders or catalog entries will be archived instead of hard-deleted.",
    )
    if (!confirmed) return

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

  function handleSectionDrop(targetId: string) {
    if (!draggedSectionId || draggedSectionId === targetId) return
    setForm((current) => {
      const fromIndex = current.contentSections.findIndex((s) => s.localId === draggedSectionId)
      const toIndex = current.contentSections.findIndex((s) => s.localId === targetId)
      if (fromIndex < 0 || toIndex < 0) return current
      return { ...current, contentSections: moveItem(current.contentSections, fromIndex, toIndex) }
    })
    setDraggedSectionId(null)
  }

  async function uploadImages(files: FileList | File[], target: "hero" | "gallery") {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    const imageFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, target === "hero" ? 1 : 10)

    if (imageFiles.length === 0) return

    if (!cloudName || !uploadPreset) {
      setError("Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for uploads.")
      return
    }

    setError("")
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
        const p = await response.json().catch(() => null)
        if (!response.ok || typeof p?.secure_url !== "string") {
          throw new Error(p?.error?.message || "Cloudinary upload failed.")
        }
        uploadedUrls.push(p.secure_url)
      }

      setForm((current) => {
        if (target === "hero") {
          return {
            ...current,
            image: uploadedUrls[0] || current.image,
            gallery: [...new Set([uploadedUrls[0], ...current.gallery].filter(Boolean))],
          }
        }
        return { ...current, gallery: [...new Set([...current.gallery, ...uploadedUrls])] }
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  const busy = isSubmitting || isDeleting || isUploading

  return (
    <>
      {/* Image crop modal */}
      {pendingHeroCropFile && (
        <ImageCropModal
          file={pendingHeroCropFile}
          folder={`teez-events/${form.id || "draft"}`}
          onUpload={(url) => {
            setForm((c) => ({
              ...c,
              image: url,
              gallery: [...new Set([url, ...c.gallery].filter(Boolean))],
            }))
            setPendingHeroCropFile(null)
          }}
          onCancel={() => setPendingHeroCropFile(null)}
        />
      )}

      <Card className="border border-border shadow-xl">
        <CardContent className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {mode === "create" ? "New Event" : "Edit Event"}
              </div>
              <h2 className="mt-1.5 text-2xl font-serif font-bold">
                {mode === "create" ? "Create a dynamic event" : form.title || form.id}
              </h2>
              {initialEvent && mode === "edit" && (
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>{initialEvent.ticketsIssued} issued</span>
                  <span>{initialEvent.spotsLeft} left</span>
                  <span>{initialEvent.paidOrders} paid orders</span>
                  <span>{formatCurrency(initialEvent.revenueCents)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-save status chip */}
              {mode === "edit" && saveStatus !== "idle" && (
                <div
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    saveStatus === "saving"
                      ? "border-border bg-muted text-muted-foreground"
                      : saveStatus === "saved"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : saveStatus === "dirty"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {saveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
                  {saveStatus === "saved" && <Check size={11} />}
                  {saveStatus === "dirty" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {saveStatus === "saving" && "Saving…"}
                  {saveStatus === "saved" && "Saved"}
                  {saveStatus === "dirty" && "Unsaved"}
                  {saveStatus === "error" && "Save failed"}
                </div>
              )}

              {mode === "edit" && form.id && (
                <>
                  <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                    <Link href={`/events/${form.id}`}>View Event</Link>
                  </Button>
                  {form.checkoutEnabled && (
                    <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                      <Link href={`/checkout/${form.id}`}>Checkout</Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive"
                    onClick={() => void handleDelete()}
                    disabled={busy}
                  >
                    {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </Button>
                </>
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
                    setStatus("Test event template loaded. Save to create a hidden test event.")
                  }}
                  disabled={busy}
                >
                  <Sparkles size={13} className="mr-1.5" />
                  Test Template
                </Button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Accordion replaces Tabs — multiple open on desktop, collapse as needed on mobile */}
            <Accordion
              type="multiple"
              defaultValue={["details"]}
              className="space-y-3"
            >
              {/* ── BASIC INFO ── */}
              <AccordionItem value="details" className="rounded-xl border border-border overflow-hidden data-[state=open]:border-primary/30">
                <AccordionTrigger className="px-5 py-3.5 text-sm font-semibold hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                  <div className="flex min-w-0 items-center gap-2.5 mr-2">
                    <CalendarDays size={15} className="shrink-0 text-primary" />
                    <span>Basic Info</span>
                    {form.title && (
                      <span className="hidden sm:inline text-xs font-normal text-muted-foreground truncate">
                        · {form.title}{form.startsAt ? ` · ${new Date(form.startsAt).toLocaleDateString()}` : ""}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-5">
                {/* Publishing toggles */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Publishing</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Controls visibility, homepage placement, and whether checkout is live.
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-semibold text-primary">
                      {form.isActive ? "Public" : "Hidden"}{form.featured ? " · Featured" : ""}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        id: `${mode}-active`,
                        label: "Show publicly",
                        helper: "Adds to public event pages.",
                        checked: form.isActive,
                        onChange: (v: boolean) => setForm((c) => ({ ...c, isActive: v })),
                      },
                      {
                        id: `${mode}-featured`,
                        label: "Feature on website",
                        helper: "Prioritizes in homepage placements.",
                        checked: form.featured,
                        onChange: (v: boolean) => setForm((c) => ({ ...c, featured: v })),
                      },
                      {
                        id: `${mode}-checkout`,
                        label: "Checkout enabled",
                        helper: "Uses live inventory and payments.",
                        checked: form.checkoutEnabled,
                        onChange: (v: boolean) => setForm((c) => ({ ...c, checkoutEnabled: v })),
                      },
                    ].map((t) => (
                      <label
                        key={t.id}
                        htmlFor={t.id}
                        className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-background/80 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">{t.label}</span>
                          <Switch id={t.id} checked={t.checked} onCheckedChange={t.onChange} disabled={busy} />
                        </div>
                        <span className="text-xs text-muted-foreground">{t.helper}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Core fields */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {mode === "create" && (
                    <div className="space-y-2">
                      <Label htmlFor={`${mode}-event-id`}>Event ID</Label>
                      <Input
                        id={`${mode}-event-id`}
                        value={form.id}
                        onChange={(e) => setForm((c) => ({ ...c, id: e.target.value }))}
                        placeholder="summer-pulse"
                        disabled={busy}
                      />
                    </div>
                  )}
                  <div className={`space-y-2 ${mode === "create" ? "" : "xl:col-span-2"}`}>
                    <Label htmlFor={`${mode}-title`}>Title</Label>
                    <Input
                      id={`${mode}-title`}
                      value={form.title}
                      onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                      placeholder="SUMMER PULSE"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-starts-at`}>Start Date & Time</Label>
                    <Input
                      id={`${mode}-starts-at`}
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-venue`}>Venue Name</Label>
                    <Input
                      id={`${mode}-venue`}
                      value={form.venue}
                      onChange={(e) => setForm((c) => ({ ...c, venue: e.target.value }))}
                      placeholder="The Grand Ballroom"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor={`${mode}-address`}>Address / Public Location</Label>
                    <Input
                      id={`${mode}-address`}
                      value={form.address}
                      onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
                      placeholder="1001 Bay St, Toronto ON"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-hosted-by`}>Hosted By</Label>
                    <Input
                      id={`${mode}-hosted-by`}
                      value={form.hostedBy}
                      onChange={(e) => setForm((c) => ({ ...c, hostedBy: e.target.value }))}
                      placeholder="TEEZ"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-category`}>Category</Label>
                    <select
                      id={`${mode}-category`}
                      value={form.category}
                      onChange={(e) => setForm((c) => ({ ...c, category: e.target.value as EventFormState["category"] }))}
                      className="w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={busy}
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="PAST">Past</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-kind`}>Event Type</Label>
                    <select
                      id={`${mode}-kind`}
                      value={form.eventKind}
                      onChange={(e) => setForm((c) => ({ ...c, eventKind: e.target.value as EventFormState["eventKind"] }))}
                      className="w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={busy}
                    >
                      <option value="SOCIAL">Social</option>
                      <option value="SIGNATURE">Signature</option>
                      <option value="THEMED">Themed</option>
                      <option value="CORPORATE">Corporate</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${mode}-tags`} className="flex items-center gap-2">
                    <Tags size={15} />
                    Tags
                  </Label>
                  <Input
                    id={`${mode}-tags`}
                    value={form.tags}
                    onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
                    placeholder="salsa, bachata, toronto"
                    disabled={busy}
                  />
                  {splitTags(form.tags).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {splitTags(form.tags).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── CONTENT ── */}
              <AccordionItem value="content" className="rounded-xl border border-border overflow-hidden data-[state=open]:border-primary/30">
                <AccordionTrigger className="px-5 py-3.5 text-sm font-semibold hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                  <div className="flex min-w-0 items-center gap-2.5 mr-2">
                    <GripVertical size={15} className="shrink-0 text-primary" />
                    <span>Content</span>
                    {(form.previewDescription || form.contentSections.length > 0) && (
                      <span className="hidden sm:inline text-xs font-normal text-muted-foreground">
                        {form.contentSections.length > 0 ? `· ${form.contentSections.length} section${form.contentSections.length !== 1 ? "s" : ""}` : "· Preview set"}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-preview`}>Preview Description</Label>
                  <p className="text-xs text-muted-foreground">Shown on event cards and the checkout page summary.</p>
                  <Textarea
                    id={`${mode}-preview`}
                    value={form.previewDescription}
                    onChange={(e) => setForm((c) => ({ ...c, previewDescription: e.target.value }))}
                    placeholder="Short listing summary for cards and checkout."
                    rows={3}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${mode}-description`}>Full Description</Label>
                  <p className="text-xs text-muted-foreground">Long-form event detail shown on the event page.</p>
                  <Textarea
                    id={`${mode}-description`}
                    value={form.description}
                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                    placeholder="Full event details, atmosphere, lineup, etc."
                    rows={6}
                    disabled={busy}
                  />
                </div>

                {/* Content Sections */}
                <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary">
                        <GripVertical size={15} />
                        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Page Sections</span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Add blocks for dress code, music, venue notes, or VIP info. Drag to reorder.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary"
                      onClick={() =>
                        setForm((c) => ({ ...c, contentSections: [...c.contentSections, emptyContentSection()] }))
                      }
                      disabled={busy}
                    >
                      <Plus size={13} className="mr-1.5" />
                      Add Section
                    </Button>
                  </div>

                  {form.contentSections.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                      No sections yet. The event page uses the description, gallery, and ticket panel.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.contentSections.map((section, index) => (
                        <div
                          key={section.localId}
                          draggable
                          onDragStart={() => setDraggedSectionId(section.localId)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleSectionDrop(section.localId)}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <GripVertical size={14} className="cursor-grab text-muted-foreground" />
                              {section.title || `Section ${index + 1}`}
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-primary text-primary"
                                onClick={() =>
                                  setForm((c) => ({
                                    ...c,
                                    contentSections:
                                      index > 0 ? moveItem(c.contentSections, index, index - 1) : c.contentSections,
                                  }))
                                }
                                disabled={busy || index === 0}
                              >
                                <ArrowUp size={12} />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-primary text-primary"
                                onClick={() =>
                                  setForm((c) => ({
                                    ...c,
                                    contentSections:
                                      index < c.contentSections.length - 1
                                        ? moveItem(c.contentSections, index, index + 1)
                                        : c.contentSections,
                                  }))
                                }
                                disabled={busy || index === form.contentSections.length - 1}
                              >
                                <ArrowDown size={12} />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 border-destructive px-2 text-destructive"
                                onClick={() =>
                                  setForm((c) => ({
                                    ...c,
                                    contentSections: c.contentSections.filter((item) => item.localId !== section.localId),
                                  }))
                                }
                                disabled={busy}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Section Title</Label>
                              <Input
                                value={section.title}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    contentSections: c.contentSections.map((item) =>
                                      item.localId === section.localId ? { ...item, title: e.target.value } : item,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Body</Label>
                              <Textarea
                                value={section.body}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    contentSections: c.contentSections.map((item) =>
                                      item.localId === section.localId ? { ...item, body: e.target.value } : item,
                                    ),
                                  }))
                                }
                                placeholder="One paragraph per line."
                                rows={3}
                                disabled={busy}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── MEDIA ── */}
              <AccordionItem value="media" className="rounded-xl border border-border overflow-hidden data-[state=open]:border-primary/30">
                <AccordionTrigger className="px-5 py-3.5 text-sm font-semibold hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                  <div className="flex min-w-0 items-center gap-2.5 mr-2">
                    <ImagePlus size={15} className="shrink-0 text-primary" />
                    <span>Media</span>
                    {(form.image || form.gallery.length > 0) && (
                      <span className="hidden sm:inline text-xs font-normal text-muted-foreground">
                        {form.image ? "· Hero set" : ""}{form.gallery.length > 0 ? ` · ${form.gallery.length} photo${form.gallery.length !== 1 ? "s" : ""}` : ""}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-6">
                {/* Hero image */}
                <div className="space-y-3">
                  <div>
                    <Label>Hero Image</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      The main banner shown at the top of the event page and checkout.
                    </p>
                  </div>

                  {/* Current hero thumbnail */}
                  {form.image && (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        <img
                          src={form.image}
                          alt="Current hero"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = "none"
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Current Hero
                        </div>
                        <div className="truncate text-xs text-foreground">{form.image}</div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => setForm((c) => ({ ...c, image: "" }))}
                        disabled={busy}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={form.image}
                      onChange={(e) => setForm((c) => ({ ...c, image: e.target.value }))}
                      placeholder="https://res.cloudinary.com/… or /images/hero.jpg"
                      className="flex-1 text-sm"
                      disabled={busy}
                    />
                    <label
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 ${busy ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <UploadCloud size={13} />
                      Crop & Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setPendingHeroCropFile(f)
                          e.target.value = ""
                        }}
                        disabled={busy}
                      />
                    </label>
                  </div>
                </div>

                {/* Gallery */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ImagePlus size={14} className="text-primary" />
                        <Label>Gallery</Label>
                        {form.gallery.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {form.gallery.length}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Shown in the lightbox slideshow on the event page.
                      </p>
                    </div>
                    <label
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary ${busy ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <Plus size={12} />
                      Add Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files) void uploadImages(e.target.files, "gallery")
                          e.target.value = ""
                        }}
                        disabled={busy}
                      />
                    </label>
                  </div>

                  {/* Drag-and-drop zone + thumbnail grid */}
                  <div
                    className="rounded-2xl border border-dashed border-border bg-muted/20 p-4"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      void uploadImages(e.dataTransfer.files, "gallery")
                    }}
                  >
                    {form.gallery.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                        <UploadCloud size={28} className="opacity-40" />
                        Drop images here or use "Add Images" above
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                        {form.gallery.map((url) => (
                          <div
                            key={url}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                          >
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).style.opacity = "0.3"
                              }}
                            />
                            {url === form.image && (
                              <div className="absolute left-1 top-1 rounded bg-primary px-1 text-[9px] font-bold uppercase text-primary-foreground">
                                Hero
                              </div>
                            )}
                            <button
                              type="button"
                              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() =>
                                setForm((c) => ({ ...c, gallery: c.gallery.filter((item) => item !== url) }))
                              }
                              disabled={busy}
                            >
                              <X size={16} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* URL paste fallback */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Or paste image URLs (one per line)</Label>
                    <Textarea
                      value={form.gallery.join("\n")}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          gallery: e.target.value
                            .split(/\n|,/)
                            .map((v) => v.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="https://… one URL per line"
                      rows={3}
                      disabled={busy}
                    />
                  </div>
                </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── TICKETS & PRICING ── */}
              <AccordionItem value="tickets" className="rounded-xl border border-border overflow-hidden data-[state=open]:border-primary/30">
                <AccordionTrigger className="px-5 py-3.5 text-sm font-semibold hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                  <div className="flex min-w-0 items-center gap-2.5 mr-2">
                    <Tags size={15} className="shrink-0 text-primary" />
                    <span>Tickets &amp; Pricing</span>
                    {(form.ticketPriceCad || form.capacity || form.ticketTiers.length > 0) && (
                      <span className="hidden sm:inline text-xs font-normal text-muted-foreground">
                        {form.ticketPriceCad ? `· $${form.ticketPriceCad}` : ""}
                        {form.capacity ? ` · ${form.capacity} cap` : ""}
                        {form.ticketTiers.length > 0 ? ` · ${form.ticketTiers.length} tier${form.ticketTiers.length !== 1 ? "s" : ""}` : ""}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-5">
                {/* Ticket settings */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-price`}>Base / Lowest Price (CAD)</Label>
                    <Input
                      id={`${mode}-price`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.ticketPriceCad}
                      onChange={(e) => setForm((c) => ({ ...c, ticketPriceCad: e.target.value }))}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-capacity`}>Capacity</Label>
                    <Input
                      id={`${mode}-capacity`}
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm((c) => ({ ...c, capacity: e.target.value }))}
                      disabled={busy}
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
                      onChange={(e) => setForm((c) => ({ ...c, maxTicketsPerOrder: e.target.value }))}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-ticket-note`}>Ticket Note</Label>
                    <Input
                      id={`${mode}-ticket-note`}
                      value={form.ticketNote}
                      onChange={(e) => setForm((c) => ({ ...c, ticketNote: e.target.value }))}
                      placeholder="Note shown on event pages"
                      disabled={busy}
                    />
                  </div>
                </div>

                {/* Ticket Tiers */}
                <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary">
                        <Tags size={15} />
                        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Ticket Tiers</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add early bird, VIP, or last-call tiers. Lowest active price becomes the public starting price.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary"
                      onClick={() =>
                        setForm((c) => ({ ...c, ticketTiers: [...c.ticketTiers, emptyTier(c.ticketTiers.length)] }))
                      }
                      disabled={busy}
                    >
                      <Plus size={13} className="mr-1.5" />
                      Add Tier
                    </Button>
                  </div>

                  {form.ticketTiers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                      No tiers yet. The base price above will be used for checkout.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.ticketTiers.map((tier, index) => (
                        <div key={tier.localId} className="rounded-xl border border-border bg-background p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">{tier.name || `Tier ${index + 1}`}</div>
                              {tier.soldCount !== undefined && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {tier.soldCount} sold · {tier.reservedCount || 0} reserved
                                  {typeof tier.spotsLeft === "number" ? ` · ${tier.spotsLeft} left` : ""}
                                  {tier.revenueCents ? ` · ${formatCurrency(tier.revenueCents)}` : ""}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive"
                              onClick={() =>
                                setForm((c) => ({ ...c, ticketTiers: c.ticketTiers.filter((t) => t.localId !== tier.localId) }))
                              }
                              disabled={busy}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Tier Name</Label>
                              <Input
                                value={tier.name}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, name: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Price (CAD)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={tier.priceCad}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, priceCad: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Cap (optional)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tier.quantityLimit}
                                placeholder="Unlimited"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, quantityLimit: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Max / Order</Label>
                              <Input
                                type="number"
                                min={1}
                                value={tier.maxPerOrder}
                                placeholder="Optional"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, maxPerOrder: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Description (optional)</Label>
                              <Input
                                value={tier.description}
                                placeholder="Buyer-facing description"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, description: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Sort Order</Label>
                              <Input
                                type="number"
                                min={0}
                                value={tier.sortOrder}
                                className="w-20"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, sortOrder: e.target.value } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-border px-3 py-2.5">
                              <span className="text-sm font-medium">Active</span>
                              <Switch
                                checked={tier.isActive}
                                onCheckedChange={(v) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, isActive: v } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-border px-3 py-2.5">
                              <span className="text-sm font-medium">Hidden</span>
                              <Switch
                                checked={tier.isHidden}
                                onCheckedChange={(v) =>
                                  setForm((c) => ({
                                    ...c,
                                    ticketTiers: c.ticketTiers.map((t) =>
                                      t.localId === tier.localId ? { ...t, isHidden: v } : t,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── VOUCHERS ── */}
              <AccordionItem value="vouchers" className="rounded-xl border border-border overflow-hidden data-[state=open]:border-primary/30">
                <AccordionTrigger className="px-5 py-3.5 text-sm font-semibold hover:no-underline hover:bg-muted/30 [&>svg]:shrink-0">
                  <div className="flex min-w-0 items-center gap-2.5 mr-2">
                    <TicketPercent size={15} className="shrink-0 text-primary" />
                    <span>Vouchers</span>
                    {form.vouchers.length > 0 && (
                      <span className="hidden sm:inline text-xs font-normal text-muted-foreground">
                        · {form.vouchers.length} code{form.vouchers.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-4">
                <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary">
                        <TicketPercent size={15} />
                        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Discount Vouchers</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Promo codes with percent or fixed discounts, redemption caps, and live windows.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary"
                        onClick={() => setForm((c) => ({ ...c, vouchers: [...c.vouchers, oneTimeFixedVoucher()] }))}
                        disabled={busy}
                      >
                        <Sparkles size={13} className="mr-1.5" />
                        One-Time
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary"
                        onClick={() => setForm((c) => ({ ...c, vouchers: [...c.vouchers, emptyVoucher()] }))}
                        disabled={busy}
                      >
                        <Plus size={13} className="mr-1.5" />
                        Add Voucher
                      </Button>
                    </div>
                  </div>

                  {form.vouchers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                      No promo codes yet. Buyers check out at full price.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.vouchers.map((voucher) => (
                        <div key={voucher.localId} className="rounded-xl border border-border bg-background p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="font-mono font-semibold">{voucher.code || "New voucher"}</div>
                              {voucher.redemptionCount !== undefined && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {voucher.redemptionCount} redemptions
                                  {voucher.discountCents ? ` · ${formatCurrency(voucher.discountCents)} discounted` : ""}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive"
                              onClick={() =>
                                setForm((c) => ({ ...c, vouchers: c.vouchers.filter((v) => v.localId !== voucher.localId) }))
                              }
                              disabled={busy}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Code</Label>
                              <Input
                                value={voucher.code}
                                className="font-mono"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, code: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Discount Type</Label>
                              <select
                                value={voucher.discountType}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId
                                        ? { ...v, discountType: e.target.value as VoucherFormState["discountType"] }
                                        : v,
                                    ),
                                  }))
                                }
                                className="w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={busy}
                              >
                                <option value="PERCENT">Percent %</option>
                                <option value="FIXED">Fixed CAD $</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                {voucher.discountType === "FIXED" ? "Amount Off (CAD)" : "Percent Off (%)"}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                step={voucher.discountType === "FIXED" ? "0.01" : "1"}
                                value={voucher.amountValue}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, amountValue: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-border px-3 py-2.5">
                              <span className="text-sm font-medium">Active</span>
                              <Switch
                                checked={voucher.isActive}
                                onCheckedChange={(v) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((item) =>
                                      item.localId === voucher.localId ? { ...item, isActive: v } : item,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </label>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Internal Note</Label>
                              <Input
                                value={voucher.description}
                                placeholder="Optional"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, description: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Min Quantity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={voucher.minimumQuantity}
                                placeholder="Optional"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, minimumQuantity: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Max Redemptions</Label>
                              <Input
                                type="number"
                                min={1}
                                value={voucher.maxRedemptions}
                                placeholder="Unlimited"
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, maxRedemptions: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Starts At</Label>
                              <Input
                                type="datetime-local"
                                value={voucher.startsAt}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, startsAt: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Expires At</Label>
                              <Input
                                type="datetime-local"
                                value={voucher.expiresAt}
                                onChange={(e) =>
                                  setForm((c) => ({
                                    ...c,
                                    vouchers: c.vouchers.map((v) =>
                                      v.localId === voucher.localId ? { ...v, expiresAt: e.target.value } : v,
                                    ),
                                  }))
                                }
                                disabled={busy}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Status / error messages */}
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {status && (
              <div className="rounded-xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-primary">
                {status}
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-accent"
                disabled={busy}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CalendarDays size={15} />
                    {mode === "create" ? "Create Event" : "Save & Refresh"}
                  </span>
                )}
              </Button>

              {isUploading && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Uploading image…
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

// ─── ADMIN EVENT STUDIO ──────────────────────────────────────────────────────

export function AdminEventStudio({ events }: { events: AdminManagedEventView[] }) {
  const createEventId = "__create__"
  const [selectedEventId, setSelectedEventId] = useState(createEventId)
  const [eventSearch, setEventSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("ALL")
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null
  const isCreating = selectedEventId === createEventId || !selectedEvent
  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase()
    return events.filter((event) => {
      if (q) {
        const haystack = `${event.title} ${event.venue ?? ""} ${event.address ?? ""} ${event.hostedBy ?? ""} ${event.eventKind}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      if (eventFilter === "UPCOMING" && event.category !== "UPCOMING") return false
      if (eventFilter === "PAST" && event.category !== "PAST") return false
      if (eventFilter === "PUBLIC" && !event.isActive) return false
      if (eventFilter === "HIDDEN" && event.isActive) return false
      if (eventFilter === "FEATURED" && !event.featured) return false
      if (eventFilter === "CHECKOUT" && !event.checkoutEnabled) return false

      return true
    })
  }, [eventFilter, eventSearch, events])
  const selectableEvents =
    selectedEvent && !filteredEvents.some((event) => event.id === selectedEvent.id)
      ? [selectedEvent, ...filteredEvents]
      : filteredEvents
  const hasEventFilters = eventSearch.trim() !== "" || eventFilter !== "ALL"

  function clearEventFilters() {
    setEventSearch("")
    setEventFilter("ALL")
  }

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

          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={eventSearch}
                  onChange={(event) => setEventSearch(event.target.value)}
                  placeholder="Search events, venue, host"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-base outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:text-sm"
                />
              </div>
              {hasEventFilters ? (
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={clearEventFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {[
                { label: "All", value: "ALL" },
                { label: "Upcoming", value: "UPCOMING" },
                { label: "Past", value: "PAST" },
                { label: "Public", value: "PUBLIC" },
                { label: "Hidden", value: "HIDDEN" },
                { label: "Featured", value: "FEATURED" },
                { label: "Checkout", value: "CHECKOUT" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setEventFilter(filter.value)}
                  className={
                    eventFilter === filter.value
                      ? "h-9 shrink-0 rounded-full border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground"
                      : "h-9 shrink-0 rounded-full border border-border bg-background px-3 text-sm font-medium text-muted-foreground"
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} events.
            </p>
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
                {selectableEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {`${event.title} - ${formatStudioDate(event.startsAt)} - ${event.isActive ? "Public" : "Hidden"}${
                      event.featured ? " - Featured" : ""
                    }`}
                  </option>
                ))}
              </select>
              {events.length > 0 && filteredEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No events match these filters. Clear filters or create a new event.
                </p>
              ) : null}
            </div>

            {!isCreating && selectedEvent ? (
              <div className="grid min-w-70 grid-cols-3 gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
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
