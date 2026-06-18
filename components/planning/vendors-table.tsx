"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type {
  EventVendorSerialized,
  VendorType,
  VendorStatus,
} from "@/lib/planning/types"
import {
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
} from "@/actions/planning"
import { cn } from "@/lib/utils"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Pencil, Building2, CheckCircle2, Clock, PhoneCall, XCircle, Users2 } from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDOR_TYPE_ICONS: Record<VendorType, string> = {
  VENUE: "🏛️",
  DJ: "🎵",
  PHOTOGRAPHER: "📸",
  VIDEOGRAPHER: "🎬",
  SECURITY: "🛡️",
  CATERING: "🍽️",
  DECOR: "💐",
  LIGHTING: "💡",
  SOUND: "🔊",
  PERFORMER: "🎤",
  SPONSOR: "🤝",
  OTHER: "📋",
}

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  VENUE: "Venue",
  DJ: "DJ",
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  SECURITY: "Security",
  CATERING: "Catering",
  DECOR: "Decor",
  LIGHTING: "Lighting",
  SOUND: "Sound",
  PERFORMER: "Performer",
  SPONSOR: "Sponsor",
  OTHER: "Other",
}

const VENDOR_TYPE_BADGE_COLORS: Record<VendorType, string> = {
  VENUE: "bg-purple-100 text-purple-700 border-purple-200",
  DJ: "bg-blue-100 text-blue-700 border-blue-200",
  PHOTOGRAPHER: "bg-pink-100 text-pink-700 border-pink-200",
  VIDEOGRAPHER: "bg-indigo-100 text-indigo-700 border-indigo-200",
  SECURITY: "bg-orange-100 text-orange-700 border-orange-200",
  CATERING: "bg-green-100 text-green-700 border-green-200",
  DECOR: "bg-rose-100 text-rose-700 border-rose-200",
  LIGHTING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SOUND: "bg-cyan-100 text-cyan-700 border-cyan-200",
  PERFORMER: "bg-teal-100 text-teal-700 border-teal-200",
  SPONSOR: "bg-lime-100 text-lime-700 border-lime-200",
  OTHER: "bg-gray-100 text-gray-600 border-gray-200",
}

const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  PENDING: "Pending",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
}

const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null) {
  if (cents == null) return "—"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        VENDOR_STATUS_COLORS[status]
      )}
    >
      {VENDOR_STATUS_LABELS[status]}
    </span>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  vendorType: VendorType | ""
  name: string
  contactName: string
  email: string
  phone: string
  website: string
  quoteCents: string
  status: VendorStatus | ""
  notes: string
}

const EMPTY_FORM: FormState = {
  vendorType: "",
  name: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  quoteCents: "",
  status: "",
  notes: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VendorsClientProps {
  eventId: string
  initialVendors: EventVendorSerialized[]
}

export function VendorsClient({ eventId, initialVendors }: VendorsClientProps) {
  const router = useRouter()
  const [vendors, setVendors] = useState<EventVendorSerialized[]>(initialVendors)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<EventVendorSerialized | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "ALL">("ALL")

  // ── Counts ────────────────────────────────────────────────────────────────

  const confirmedCount = vendors.filter((v) => v.status === "CONFIRMED").length
  const pendingCount = vendors.filter((v) => v.status === "PENDING").length
  const contactedCount = vendors.filter((v) => v.status === "CONTACTED").length
  const cancelledCount = vendors.filter(
    (v) => v.status === "CANCELLED" || v.status === "REJECTED"
  ).length
  const totalBudget = vendors.reduce((s, v) => s + (v.quoteCents ?? 0), 0)

  const filteredVendors =
    statusFilter === "ALL"
      ? vendors
      : vendors.filter((v) => v.status === statusFilter)

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingVendor(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(vendor: EventVendorSerialized) {
    setEditingVendor(vendor)
    setForm({
      vendorType: vendor.vendorType,
      name: vendor.name,
      contactName: vendor.contactName ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      website: vendor.website ?? "",
      quoteCents: vendor.quoteCents != null ? String(vendor.quoteCents / 100) : "",
      status: vendor.status,
      notes: vendor.notes ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingVendor(null)
    setForm(EMPTY_FORM)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendorType || !form.name || !form.status) return
    setSubmitting(true)

    const payload = {
      vendorType: form.vendorType as VendorType,
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      quoteCents: form.quoteCents
        ? Math.round(parseFloat(form.quoteCents) * 100)
        : undefined,
      status: form.status as VendorStatus,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, payload)
      } else {
        await createVendor(eventId, payload)
      }
      closeDialog()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  // ── Inline status update ──────────────────────────────────────────────────

  async function handleStatusChange(vendorId: string, newStatus: VendorStatus) {
    setUpdatingStatusId(vendorId)
    try {
      await updateVendorStatus(vendorId, newStatus)
      router.refresh()
    } finally {
      setUpdatingStatusId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(vendorId: string) {
    setDeletingId(vendorId)
    try {
      await deleteVendor(vendorId)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-wide text-[#c57a3a]">
          Vendors
        </h1>
        <Button
          onClick={openAddDialog}
          className="bg-[#c57a3a] text-white hover:bg-[#a8652e]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "ALL"
              ? "bg-[#c57a3a] text-white border-[#c57a3a]"
              : "bg-white border-[#c57a3a]/30 text-[#c57a3a] hover:bg-[#F7EDDB]"
          )}
        >
          <Users2 className="h-3.5 w-3.5" />
          All ({vendors.length})
        </button>
        <button
          onClick={() => setStatusFilter("CONFIRMED")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "CONFIRMED"
              ? "bg-green-600 text-white border-green-600"
              : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "PENDING"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setStatusFilter("CONTACTED")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "CONTACTED"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          )}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Contacted ({contactedCount})
        </button>
        {cancelledCount > 0 && (
          <button
            onClick={() => setStatusFilter("CANCELLED")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === "CANCELLED"
                ? "bg-gray-500 text-white border-gray-500"
                : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancelled ({cancelledCount})
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#c57a3a]/20 bg-[#F7EDDB]/60 px-3 py-1 text-xs font-medium text-[#c57a3a]">
          <Building2 className="h-3.5 w-3.5" />
          Total Budget: {formatCents(totalBudget)}
        </div>
      </div>

      {/* Table */}
      <Card className="border-[#c57a3a]/20 bg-white/70">
        <CardContent className="p-0">
          {vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl py-16 text-center">
              <div className="mb-3 rounded-full bg-[#F7EDDB] p-4">
                <Building2 className="h-8 w-8 text-[#c57a3a]/60" />
              </div>
              <p className="text-base font-medium text-foreground">No vendors yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start building your vendor list for this event.
              </p>
              <Button
                onClick={openAddDialog}
                className="mt-4 bg-[#c57a3a] text-white hover:bg-[#a8652e]"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Vendor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#c57a3a]/10 bg-[#F7EDDB]/60">
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Quote</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-24 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No vendors match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="border-[#c57a3a]/10 hover:bg-[#F7EDDB]/30"
                    >
                      {/* Vendor name + type */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{vendor.name}</span>
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              VENDOR_TYPE_BADGE_COLORS[vendor.vendorType]
                            )}
                          >
                            <span>{VENDOR_TYPE_ICONS[vendor.vendorType]}</span>
                            {VENDOR_TYPE_LABELS[vendor.vendorType]}
                          </span>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          {vendor.contactName && (
                            <span className="font-medium text-foreground/80">{vendor.contactName}</span>
                          )}
                          {vendor.email && <span>{vendor.email}</span>}
                          {vendor.phone && <span>{vendor.phone}</span>}
                          {!vendor.contactName && !vendor.email && !vendor.phone && "—"}
                        </div>
                      </TableCell>

                      {/* Quote */}
                      <TableCell className="text-sm font-medium">
                        {formatCents(vendor.quoteCents)}
                      </TableCell>

                      {/* Notes preview */}
                      <TableCell className="max-w-45 text-sm text-muted-foreground">
                        {vendor.notes
                          ? vendor.notes.length > 60
                            ? vendor.notes.slice(0, 60) + "…"
                            : vendor.notes
                          : "—"}
                      </TableCell>

                      {/* Status inline change */}
                      <TableCell>
                        <Select
                          value={vendor.status}
                          onValueChange={(v) =>
                            handleStatusChange(vendor.id, v as VendorStatus)
                          }
                          disabled={updatingStatusId === vendor.id}
                        >
                          <SelectTrigger className="h-8 w-34 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <VendorStatusBadge status={vendor.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(VENDOR_STATUS_LABELS) as VendorStatus[]).map(
                              (key) => (
                                <SelectItem key={key} value={key}>
                                  {VENDOR_STATUS_LABELS[key]}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-[#c57a3a]"
                            onClick={() => openEditDialog(vendor)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDelete(vendor.id)}
                            disabled={deletingId === vendor.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#c57a3a]">
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Type + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.vendorType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, vendorType: v as VendorType }))
                  }
                  required
                >
                  <SelectTrigger id="vendor-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VENDOR_TYPE_LABELS) as VendorType[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {VENDOR_TYPE_ICONS[key]} {VENDOR_TYPE_LABELS[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendor-status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as VendorStatus }))
                  }
                  required
                >
                  <SelectTrigger id="vendor-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VENDOR_STATUS_LABELS) as VendorStatus[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {VENDOR_STATUS_LABELS[key]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">
                Vendor Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Company or individual name"
                required
              />
            </div>

            {/* Row 2: Contact + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-contact">Contact Name</Label>
                <Input
                  id="vendor-contact"
                  value={form.contactName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactName: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-email">Email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Row 3: Phone + Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-website">Website</Label>
                <Input
                  id="vendor-website"
                  type="url"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Row 4: Quote */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-quote">Quote / Contract Amount (CAD)</Label>
              <Input
                id="vendor-quote"
                type="number"
                min="0"
                step="0.01"
                value={form.quoteCents}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quoteCents: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-notes">Notes</Label>
              <Textarea
                id="vendor-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional notes"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || !form.vendorType || !form.name || !form.status
                }
                className="bg-[#c57a3a] text-white hover:bg-[#a8652e]"
              >
                {submitting
                  ? editingVendor
                    ? "Saving…"
                    : "Adding…"
                  : editingVendor
                  ? "Save Changes"
                  : "Add Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
