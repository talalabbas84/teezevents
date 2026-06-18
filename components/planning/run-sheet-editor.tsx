"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { RunSheetItemSerialized, RunSheetStatus } from "@/lib/planning/types"
import {
  createRunSheetItem,
  updateRunSheetItemStatus,
  deleteRunSheetItem,
} from "@/actions/planning"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeProps(status: RunSheetStatus): {
  variant: "outline" | "default" | "secondary" | "destructive"
  className: string
  label: string
  icon: React.ReactNode
} {
  switch (status) {
    case "UPCOMING":
      return {
        variant: "outline",
        className: "border-gray-400 text-gray-600",
        label: "Upcoming",
        icon: <Clock className="h-3 w-3" />,
      }
    case "IN_PROGRESS":
      return {
        variant: "default",
        className: "bg-blue-100 text-blue-700 border-blue-300",
        label: "In Progress",
        icon: <PlayCircle className="h-3 w-3" />,
      }
    case "DONE":
      return {
        variant: "default",
        className: "bg-green-100 text-green-700 border-green-300",
        label: "Done",
        icon: <CheckCircle2 className="h-3 w-3" />,
      }
    case "DELAYED":
      return {
        variant: "default",
        className: "bg-orange-100 text-orange-700 border-orange-300",
        label: "Delayed",
        icon: <AlertCircle className="h-3 w-3" />,
      }
    case "CANCELLED":
      return {
        variant: "secondary",
        className: "bg-gray-100 text-gray-500 border-gray-200",
        label: "Cancelled",
        icon: <XCircle className="h-3 w-3" />,
      }
  }
}

type FormState = {
  time: string
  title: string
  description: string
  ownerName: string
  location: string
  durationMins: string
  notes: string
}

const emptyForm: FormState = {
  time: "",
  title: "",
  description: "",
  ownerName: "",
  location: "",
  durationMins: "",
  notes: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RunSheetClientProps {
  eventId: string
  initialItems: RunSheetItemSerialized[]
}

export function RunSheetClient({ eventId, initialItems }: RunSheetClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<RunSheetItemSerialized[]>(initialItems)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time))

  function handleField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAdd() {
    if (!form.title.trim() || !form.time.trim()) return
    setSaving(true)
    try {
      await createRunSheetItem(eventId, {
        time: form.time.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        ownerName: form.ownerName.trim() || undefined,
        location: form.location.trim() || undefined,
        durationMins: form.durationMins ? parseInt(form.durationMins, 10) : undefined,
        notes: form.notes.trim() || undefined,
      })
      setDialogOpen(false)
      setForm(emptyForm)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(itemId: string, status: RunSheetStatus) {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status } : it))
    )
    await updateRunSheetItemStatus(itemId, status)
    router.refresh()
  }

  async function handleDelete(itemId: string) {
    setDeletingId(itemId)
    try {
      await deleteRunSheetItem(itemId)
      setItems((prev) => prev.filter((it) => it.id !== itemId))
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#c57a3a]">Run Sheet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Run Sheet — print or share this with your team
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#c57a3a]/40 text-[#c57a3a] hover:bg-[#c57a3a]/10"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-[#c57a3a] text-white hover:bg-[#b06a2a]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Timeline list */}
      {sorted.length === 0 ? (
        <Card className="border-dashed border-[#c57a3a]/30 bg-white/60">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock className="h-8 w-8 text-[#c57a3a]/40" />
            <p className="text-sm text-gray-500">No run sheet items yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[5.5rem] top-0 h-full w-px bg-[#c57a3a]/20 print:hidden" />

          {sorted.map((item) => {
            const badge = statusBadgeProps(item.status)
            return (
              <div key={item.id} className="group relative flex gap-4">
                {/* Time column */}
                <div className="w-20 shrink-0 pt-4 text-right">
                  <span className="font-mono text-sm font-semibold text-[#c57a3a]">
                    {item.time}
                  </span>
                </div>

                {/* Timeline dot */}
                <div className="relative flex shrink-0 flex-col items-center print:hidden">
                  <div
                    className={cn(
                      "mt-5 h-3 w-3 rounded-full border-2",
                      item.status === "DONE"
                        ? "border-green-500 bg-green-400"
                        : item.status === "IN_PROGRESS"
                          ? "border-blue-500 bg-blue-400"
                          : item.status === "DELAYED"
                            ? "border-orange-500 bg-orange-400"
                            : item.status === "CANCELLED"
                              ? "border-gray-400 bg-gray-300"
                              : "border-[#c57a3a]/60 bg-[#F7EDDB]"
                    )}
                  />
                </div>

                {/* Card */}
                <Card
                  className={cn(
                    "mb-3 flex-1 border border-[#c57a3a]/20 bg-white/80 shadow-sm transition-shadow hover:shadow-md",
                    item.status === "CANCELLED" && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={cn(
                              "font-semibold text-gray-800",
                              item.status === "CANCELLED" && "line-through text-gray-400"
                            )}
                          >
                            {item.title}
                          </h3>
                          <Badge
                            variant={badge.variant}
                            className={cn("flex items-center gap-1 text-xs", badge.className)}
                          >
                            {badge.icon}
                            {badge.label}
                          </Badge>
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {item.ownerName && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Owner:</span> {item.ownerName}
                            </span>
                          )}
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Location:</span> {item.location}
                            </span>
                          )}
                          {item.durationMins != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.durationMins} min
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs italic text-gray-500">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap gap-1 print:hidden">
                        {item.status !== "IN_PROGRESS" && item.status !== "CANCELLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-blue-300 px-2 text-xs text-blue-600 hover:bg-blue-50"
                            onClick={() => handleStatusChange(item.id, "IN_PROGRESS")}
                          >
                            <PlayCircle className="mr-1 h-3 w-3" />
                            Start
                          </Button>
                        )}
                        {item.status !== "DONE" && item.status !== "CANCELLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-green-300 px-2 text-xs text-green-600 hover:bg-green-50"
                            onClick={() => handleStatusChange(item.id, "DONE")}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Done
                          </Button>
                        )}
                        {item.status !== "DELAYED" && item.status !== "CANCELLED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-orange-300 px-2 text-xs text-orange-600 hover:bg-orange-50"
                            onClick={() => handleStatusChange(item.id, "DELAYED")}
                          >
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Delay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-400 hover:text-red-500"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-[#F7EDDB]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#c57a3a]">
              Add Run Sheet Item
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">
                  Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="19:30"
                  value={form.time}
                  onChange={(e) => handleField("time", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Duration (mins)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="30"
                  value={form.durationMins}
                  onChange={(e) => handleField("durationMins", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Doors open"
                value={form.title}
                onChange={(e) => handleField("title", e.target.value)}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Description</Label>
              <Textarea
                placeholder="Optional details…"
                value={form.description}
                onChange={(e) => handleField("description", e.target.value)}
                rows={2}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Owner</Label>
                <Input
                  placeholder="John Smith"
                  value={form.ownerName}
                  onChange={(e) => handleField("ownerName", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Location</Label>
                <Input
                  placeholder="Main stage"
                  value={form.location}
                  onChange={(e) => handleField("location", e.target.value)}
                  className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Notes</Label>
              <Textarea
                placeholder="Internal notes…"
                value={form.notes}
                onChange={(e) => handleField("notes", e.target.value)}
                rows={2}
                className="border-[#c57a3a]/30 bg-white focus-visible:ring-[#c57a3a]/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setForm(emptyForm)
              }}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !form.title.trim() || !form.time.trim()}
              onClick={handleAdd}
              className="bg-[#c57a3a] text-white hover:bg-[#b06a2a]"
            >
              {saving ? "Saving…" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
