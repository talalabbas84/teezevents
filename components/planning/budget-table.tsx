"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type {
  BudgetItemSerialized,
  BudgetCategory,
  BudgetItemStatus,
} from "@/lib/planning/types"
import {
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
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
import { Badge } from "@/components/ui/badge"
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
import { Plus, Trash2, Pencil, DollarSign, Download } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  VENUE: "Venue",
  DJ_MUSIC: "DJ & Music",
  PERFORMERS: "Performers",
  STAFF: "Staff",
  MARKETING: "Marketing",
  DECORATIONS: "Decorations",
  FOOD_DRINKS: "Food & Drinks",
  SECURITY: "Security",
  EQUIPMENT: "Equipment",
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  MISCELLANEOUS: "Misc",
}

const STATUS_LABELS: Record<BudgetItemStatus, string> = {
  ESTIMATED: "Estimated",
  CONFIRMED: "Confirmed",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BudgetItemStatus }) {
  const variants: Record<BudgetItemStatus, string> = {
    ESTIMATED: "border border-input bg-transparent text-foreground",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    PAID: "bg-green-100 text-green-800 border-green-200",
    OVERDUE: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-muted text-muted-foreground border-muted",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        variants[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  category: BudgetCategory | ""
  title: string
  vendorName: string
  estimatedCents: string
  actualCents: string
  status: BudgetItemStatus | ""
  notes: string
}

const EMPTY_FORM: FormState = {
  category: "",
  title: "",
  vendorName: "",
  estimatedCents: "",
  actualCents: "",
  status: "",
  notes: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BudgetClientProps {
  eventId: string
  initialItems: BudgetItemSerialized[]
}

export function BudgetClient({ eventId, initialItems }: BudgetClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<BudgetItemSerialized[]>(initialItems)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItemSerialized | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalEstimated = items.reduce((s, i) => s + i.estimatedCents, 0)
  const totalActual = items.reduce((s, i) => s + i.actualCents, 0)
  const totalPaid = items.reduce((s, i) => s + i.paidCents, 0)
  const variance = totalActual - totalEstimated

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(item: BudgetItemSerialized) {
    setEditingItem(item)
    setForm({
      category: item.category,
      title: item.title,
      vendorName: item.vendorName ?? "",
      estimatedCents: String(item.estimatedCents / 100),
      actualCents: item.actualCents ? String(item.actualCents / 100) : "",
      status: item.status,
      notes: item.notes ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.title || !form.status) return
    setSubmitting(true)

    const payload = {
      category: form.category as BudgetCategory,
      title: form.title.trim(),
      vendorName: form.vendorName.trim() || undefined,
      estimatedCents: Math.round(parseFloat(form.estimatedCents || "0") * 100),
      actualCents: form.actualCents
        ? Math.round(parseFloat(form.actualCents) * 100)
        : 0,
      status: form.status as BudgetItemStatus,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (editingItem) {
        await updateBudgetItem(editingItem.id, payload)
      } else {
        await createBudgetItem(eventId, payload)
      }
      closeDialog()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(itemId: string) {
    setDeletingId(itemId)
    try {
      await deleteBudgetItem(itemId)
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
          Budget
        </h1>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/planning/${eventId}/export/budget`}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Download size={12} />
            Export CSV
          </a>
          <Button
            onClick={openAddDialog}
            className="bg-[#c57a3a] text-white hover:bg-[#a8652e]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Budget Item
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-[#c57a3a]" />
              Total Estimated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">
              {formatCents(totalEstimated)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-[#c57a3a]" />
              Total Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">
              {formatCents(totalActual)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-[#c57a3a]" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-green-700">
              {formatCents(totalPaid)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#c57a3a]/20 bg-white/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-[#c57a3a]" />
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-xl font-semibold",
                variance > 0 ? "text-red-600" : "text-green-700"
              )}
            >
              {variance > 0 ? "+" : ""}
              {formatCents(variance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-[#c57a3a]/20 bg-white/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#c57a3a]/10 bg-[#F7EDDB]/60">
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Vendor</TableHead>
                <TableHead className="font-semibold">Estimated</TableHead>
                <TableHead className="font-semibold">Actual</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-20 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No budget items yet. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-[#c57a3a]/10 hover:bg-[#F7EDDB]/30"
                  >
                    <TableCell className="text-sm">
                      {CATEGORY_LABELS[item.category]}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.vendorName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCents(item.estimatedCents)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCents(item.actualCents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-[#c57a3a]"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
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
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#c57a3a]">
              {editingItem ? "Edit Budget Item" : "Add Budget Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as BudgetCategory }))
                }
                required
              >
                <SelectTrigger id="budget-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as BudgetCategory[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="budget-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Venue deposit"
                required
              />
            </div>

            {/* Vendor Name */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-vendor">Vendor Name</Label>
              <Input
                id="budget-vendor"
                value={form.vendorName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vendorName: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            {/* Estimated */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-estimated">Estimated (CAD)</Label>
              <Input
                id="budget-estimated"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCents}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estimatedCents: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>

            {/* Actual */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-actual">Actual (CAD)</Label>
              <Input
                id="budget-actual"
                type="number"
                min="0"
                step="0.01"
                value={form.actualCents}
                onChange={(e) =>
                  setForm((f) => ({ ...f, actualCents: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as BudgetItemStatus }))
                }
                required
              >
                <SelectTrigger id="budget-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as BudgetItemStatus[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {STATUS_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-notes">Notes</Label>
              <Textarea
                id="budget-notes"
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
                disabled={submitting || !form.category || !form.title || !form.status}
                className="bg-[#c57a3a] text-white hover:bg-[#a8652e]"
              >
                {submitting
                  ? "Saving…"
                  : editingItem
                  ? "Save Changes"
                  : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
