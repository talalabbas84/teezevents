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
import { Plus, Trash2, Users, CheckCircle2, Clock } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null) {
  if (cents == null) return "—"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  PENDING: "Pending",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const variants: Record<VendorStatus, string> = {
    PENDING: "border border-input bg-transparent text-muted-foreground",
    CONTACTED: "bg-blue-100 text-blue-800 border-blue-200",
    CONFIRMED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-muted text-muted-foreground border-muted",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        variants[status]
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // ── Counts ────────────────────────────────────────────────────────────────

  const totalCount = vendors.length
  const confirmedCount = vendors.filter((v) => v.status === "CONFIRMED").length
  const pendingCount = vendors.filter((v) => v.status === "PENDING").length

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openAddDialog() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
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
      quoteCents: form.quoteCents
        ? Math.round(parseFloat(form.quoteCents) * 100)
        : undefined,
      status: form.status as VendorStatus,
      notes: form.notes.trim() || undefined,
    }

    try {
      await createVendor(eventId, payload)
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-[#c57a3a]" />
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{totalCount}</p>
          </CardContent>
        </Card>

        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-green-700">{confirmedCount}</p>
          </CardContent>
        </Card>

        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-[#c57a3a]/20 bg-white/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#c57a3a]/10 bg-[#F7EDDB]/60">
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Email / Phone</TableHead>
                <TableHead className="font-semibold">Quote</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-15 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No vendors yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    className="border-[#c57a3a]/10 hover:bg-[#F7EDDB]/30"
                  >
                    <TableCell className="text-sm">
                      {VENDOR_TYPE_LABELS[vendor.vendorType]}
                    </TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {vendor.contactName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {vendor.email && <span>{vendor.email}</span>}
                        {vendor.phone && <span>{vendor.phone}</span>}
                        {!vendor.email && !vendor.phone && "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCents(vendor.quoteCents)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={vendor.status}
                        onValueChange={(v) =>
                          handleStatusChange(vendor.id, v as VendorStatus)
                        }
                        disabled={updatingStatusId === vendor.id}
                      >
                        <SelectTrigger className="h-8 w-32.5 border-0 bg-transparent p-0 shadow-none focus:ring-0">
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
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDelete(vendor.id)}
                        disabled={deletingId === vendor.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#c57a3a]">
              Add Vendor
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vendor Type */}
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
                        {VENDOR_TYPE_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">
                Name <span className="text-red-500">*</span>
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

            {/* Contact Name */}
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

            {/* Email */}
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

            {/* Phone */}
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

            {/* Quote */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-quote">Quote (CAD)</Label>
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

            {/* Status */}
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
                {submitting ? "Saving…" : "Add Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
