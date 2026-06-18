"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, CheckCircle2, Circle, Flag, Plus, Trash2 } from "lucide-react"

import { createTimelineItem, toggleTimelineItem, deleteTimelineItem } from "@/actions/planning"
import type { PlanningTimelineItemSerialized } from "@/lib/planning/types"
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
import { cn } from "@/lib/utils"

function groupByMonth(items: PlanningTimelineItemSerialized[]) {
  const groups: Record<string, PlanningTimelineItemSerialized[]> = {}
  for (const item of items) {
    const date = new Date(item.dueDate)
    const key = date.toLocaleDateString("en-CA", { year: "numeric", month: "long" })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return Object.entries(groups)
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function isOverdue(iso: string, isCompleted: boolean) {
  return !isCompleted && new Date(iso) < new Date()
}

const EMPTY_FORM = {
  title: "",
  dueDate: "",
  category: "",
  isMilestone: false,
  description: "",
  assignedTo: "",
}

export function TimelineClient({
  eventId,
  initialItems,
}: {
  eventId: string
  initialItems: PlanningTimelineItemSerialized[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = [...initialItems].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )
  const completed = sorted.filter((i) => i.isCompleted).length
  const total = sorted.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const grouped = groupByMonth(sorted)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.dueDate) return
    setSubmitting(true)
    try {
      await createTimelineItem(eventId, {
        title: form.title.trim(),
        dueDate: new Date(form.dueDate),
        category: form.category.trim() || undefined,
        isMilestone: form.isMilestone,
        description: form.description.trim() || undefined,
        assignedTo: form.assignedTo.trim() || undefined,
      })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(item: PlanningTimelineItemSerialized) {
    setTogglingId(item.id)
    try {
      await toggleTimelineItem(item.id, !item.isCompleted)
      startTransition(() => router.refresh())
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Delete this timeline item?")) return
    setDeletingId(itemId)
    try {
      await deleteTimelineItem(itemId)
      startTransition(() => router.refresh())
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Planning</div>
          <h1 className="mt-1 font-serif text-3xl font-bold">Timeline</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} className="mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-semibold">{completed} / {total} completed ({pct}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {total === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarDays size={32} className="text-muted-foreground" />
            <p className="text-muted-foreground">No timeline items yet. Add milestones and deadlines to track your planning progress.</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus size={14} className="mr-1.5" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped timeline */}
      <div className="space-y-8">
        {grouped.map(([month, items]) => (
          <div key={month}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {month}
            </h2>
            <div className="space-y-2">
              {items.map((item) => {
                const overdue = isOverdue(item.dueDate, item.isCompleted)
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "transition-opacity",
                      item.isCompleted && "opacity-60",
                    )}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id}
                        className="shrink-0 text-muted-foreground hover:text-primary"
                        aria-label={item.isCompleted ? "Mark incomplete" : "Mark complete"}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 size={20} className="text-primary" />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>

                      <div className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                        {formatDay(item.dueDate)}
                      </div>

                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {item.isMilestone && (
                          <Flag size={14} className="shrink-0 text-primary" />
                        )}
                        <span
                          className={cn(
                            "font-medium",
                            item.isCompleted && "line-through text-muted-foreground",
                            overdue && "text-destructive",
                          )}
                        >
                          {item.title}
                        </span>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        )}
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                        {item.assignedTo && (
                          <span className="text-xs text-muted-foreground">→ {item.assignedTo}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Timeline Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tl-title">Title *</Label>
              <Input
                id="tl-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Venue confirmed"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tl-due">Due Date *</Label>
              <Input
                id="tl-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tl-cat">Category</Label>
                <Input
                  id="tl-cat"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Venue"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tl-assigned">Assigned To</Label>
                <Input
                  id="tl-assigned"
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  placeholder="Name or email"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tl-milestone"
                type="checkbox"
                checked={form.isMilestone}
                onChange={(e) => setForm((f) => ({ ...f, isMilestone: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="tl-milestone" className="cursor-pointer">Mark as milestone</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {submitting ? "Adding…" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
