"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Star,
  Building2,
  ExternalLink,
  Trash2,
  Pencil,
} from "lucide-react"

import {
  createGlobalVendor,
  updateGlobalVendor,
  deleteGlobalVendor,
} from "@/actions/global-vendors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ───────────────────────────────────────────────────────────────────

type VendorType =
  | "VENUE"
  | "DJ"
  | "PHOTOGRAPHER"
  | "VIDEOGRAPHER"
  | "SECURITY"
  | "CATERING"
  | "DECOR"
  | "LIGHTING"
  | "SOUND"
  | "PERFORMER"
  | "SPONSOR"
  | "OTHER"

interface GlobalVendor {
  id: string
  name: string
  vendorType: VendorType
  contactName: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  tags: string[]
  rating: number | null
  isActive: boolean
  createdAt: Date
}

interface Props {
  initialVendors: GlobalVendor[]
}

const VENDOR_TYPES: VendorType[] = [
  "VENUE", "DJ", "PHOTOGRAPHER", "VIDEOGRAPHER", "SECURITY",
  "CATERING", "DECOR", "LIGHTING", "SOUND", "PERFORMER", "SPONSOR", "OTHER",
]

function vendorTypeLabel(type: VendorType): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ")
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground text-sm">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  )
}

// ─── Blank form state ─────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: "",
  vendorType: "OTHER" as VendorType,
  contactName: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
  tags: "",
  rating: "",
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalVendorsClient({ initialVendors }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<VendorType | "ALL">("ALL")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  // ─── Filtered vendors ──────────────────────────────────────────────────────

  const filtered = initialVendors.filter((v) => {
    const matchesSearch =
      search.trim() === "" ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contactName ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "ALL" || v.vendorType === typeFilter

    return matchesSearch && matchesType
  })

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const typeCounts = VENDOR_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = initialVendors.filter((v) => v.vendorType === t).length
    return acc
  }, {})

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null)
    setForm(BLANK_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(vendor: GlobalVendor) {
    setEditingId(vendor.id)
    setForm({
      name: vendor.name,
      vendorType: vendor.vendorType,
      contactName: vendor.contactName ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      website: vendor.website ?? "",
      notes: vendor.notes ?? "",
      tags: vendor.tags.join(", "),
      rating: vendor.rating != null ? String(vendor.rating) : "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function handleFormChange(field: keyof typeof BLANK_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!form.name.trim()) {
      setFormError("Vendor name is required.")
      return
    }
    setFormError(null)

    const payload = {
      name: form.name.trim(),
      vendorType: form.vendorType,
      contactName: form.contactName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
    }

    startTransition(async () => {
      const result = editingId
        ? await updateGlobalVendor(editingId, payload)
        : await createGlobalVendor(payload)

      if (result.success) {
        setDialogOpen(false)
        router.refresh()
      } else {
        setFormError(result.error ?? "Something went wrong.")
      }
    })
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    if (!confirm("Delete this vendor? This cannot be undone.")) return
    startTransition(async () => {
      await deleteGlobalVendor(id)
      router.refresh()
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="flex items-center gap-3 px-5 py-3">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total Vendors</div>
              <div className="font-serif text-2xl font-bold">{initialVendors.length}</div>
            </div>
          </CardContent>
        </Card>
        {VENDOR_TYPES.filter((t) => (typeCounts[t] ?? 0) > 0).map((t) => (
          <Card key={t} className="border border-border shadow-sm">
            <CardContent className="px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {vendorTypeLabel(t)}
              </div>
              <div className="font-serif text-xl font-bold">{typeCounts[t]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as VendorType | "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {VENDOR_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {vendorTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={openAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-lg">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-serif text-lg font-bold text-muted-foreground">No vendors found</p>
              <p className="text-sm text-muted-foreground">
                {search || typeFilter !== "ALL"
                  ? "Try adjusting your search or filter."
                  : "Add your first vendor to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((vendor) => (
                    <TableRow key={vendor.id} className="border-border hover:bg-muted/10">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{vendor.name}</span>
                          {vendor.website && (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {vendor.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {vendor.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {vendorTypeLabel(vendor.vendorType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{vendor.contactName ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {vendor.email ? (
                          <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                            {vendor.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{vendor.phone ?? "—"}</TableCell>
                      <TableCell>
                        <StarRating rating={vendor.rating} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => openEdit(vendor)}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(vendor.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingId ? "Edit Vendor" : "Add Vendor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="v-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="v-name"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g. Beats by Alex"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="v-type">Vendor Type</Label>
              <Select
                value={form.vendorType}
                onValueChange={(v) => handleFormChange("vendorType", v)}
              >
                <SelectTrigger id="v-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {vendorTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact name */}
            <div className="space-y-1.5">
              <Label htmlFor="v-contact">Contact Name</Label>
              <Input
                id="v-contact"
                value={form.contactName}
                onChange={(e) => handleFormChange("contactName", e.target.value)}
                placeholder="e.g. Alex Johnson"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-email">Email</Label>
                <Input
                  id="v-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="alex@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-phone">Phone</Label>
                <Input
                  id="v-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFormChange("phone", e.target.value)}
                  placeholder="+1 (416) 555-0100"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label htmlFor="v-website">Website</Label>
              <Input
                id="v-website"
                type="url"
                value={form.website}
                onChange={(e) => handleFormChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label htmlFor="v-rating">Rating (1–5)</Label>
              <Select
                value={form.rating}
                onValueChange={(v) => handleFormChange("rating", v)}
              >
                <SelectTrigger id="v-rating">
                  <SelectValue placeholder="No rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No rating</SelectItem>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {"★".repeat(r)}{"☆".repeat(5 - r)} ({r})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="v-tags">Tags (comma-separated)</Label>
              <Input
                id="v-tags"
                value={form.tags}
                onChange={(e) => handleFormChange("tags", e.target.value)}
                placeholder="e.g. afrobeats, nightlife, toronto"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="v-notes">Notes</Label>
              <Textarea
                id="v-notes"
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Internal notes about this vendor…"
                rows={3}
              />
            </div>

            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "Saving…" : editingId ? "Save Changes" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
