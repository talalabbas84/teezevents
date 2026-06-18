"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { ChecklistSerialized, ChecklistCategory } from "@/lib/planning/types"
import {
  createChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/actions/planning"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react"

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  VENUE: "Venue",
  VENDORS: "Vendors",
  MARKETING: "Marketing",
  TICKETING: "Ticketing",
  STAFF: "Staff",
  PERFORMERS: "Performers",
  BUDGET: "Budget",
  LEGAL: "Legal & Permits",
  SOUND_LIGHTS: "Sound & Lights",
  SECURITY: "Security",
  DECORATIONS: "Decorations",
  FOOD_DRINKS: "Food & Drinks",
  DAY_OF_EVENT: "Day of Event",
  POST_EVENT: "Post-Event",
  GENERAL: "General",
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ChecklistCategory[]

const CATEGORY_BADGE_COLORS: Record<ChecklistCategory, string> = {
  VENUE: "bg-purple-100 text-purple-700 border-purple-200",
  VENDORS: "bg-blue-100 text-blue-700 border-blue-200",
  MARKETING: "bg-pink-100 text-pink-700 border-pink-200",
  TICKETING: "bg-indigo-100 text-indigo-700 border-indigo-200",
  STAFF: "bg-teal-100 text-teal-700 border-teal-200",
  PERFORMERS: "bg-yellow-100 text-yellow-700 border-yellow-200",
  BUDGET: "bg-green-100 text-green-700 border-green-200",
  LEGAL: "bg-red-100 text-red-700 border-red-200",
  SOUND_LIGHTS: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SECURITY: "bg-orange-100 text-orange-700 border-orange-200",
  DECORATIONS: "bg-rose-100 text-rose-700 border-rose-200",
  FOOD_DRINKS: "bg-lime-100 text-lime-700 border-lime-200",
  DAY_OF_EVENT: "bg-amber-100 text-amber-700 border-amber-200",
  POST_EVENT: "bg-slate-100 text-slate-700 border-slate-200",
  GENERAL: "bg-gray-100 text-gray-600 border-gray-200",
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  )
}

// ─── Checklist card ───────────────────────────────────────────────────────────

function ChecklistCard({
  checklist,
  onToggle,
  onAddItem,
  onDeleteItem,
  isPending,
}: {
  checklist: ChecklistSerialized
  onToggle: (itemId: string, currentValue: boolean) => void
  onAddItem: (checklistId: string, title: string) => void
  onDeleteItem: (itemId: string) => void
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [newItemTitle, setNewItemTitle] = useState("")
  const [addingItem, setAddingItem] = useState(false)

  // Aggregate items: sections + root-level items
  const allItems = [
    ...checklist.sections.flatMap((s) => s.items),
    ...checklist.items,
  ]
  const completedCount = allItems.filter((i) => i.isCompleted).length
  const totalCount = allItems.length

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const title = newItemTitle.trim()
    if (!title) return
    setAddingItem(true)
    try {
      onAddItem(checklist.id, title)
      setNewItemTitle("")
    } finally {
      setAddingItem(false)
    }
  }

  return (
    <Card className="border-border bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="font-serif text-base font-semibold text-foreground">
                {checklist.title}
              </CardTitle>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${CATEGORY_BADGE_COLORS[checklist.category]}`}
              >
                {CATEGORY_LABELS[checklist.category]}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar completed={completedCount} total={totalCount} />
            </div>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* Sectioned items */}
          {checklist.sections.map((section) => (
            <div key={section.id} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => onToggle(item.id, item.isCompleted)}
                      disabled={isPending}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-[#c57a3a]"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      disabled={isPending}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-40"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Root items (no section) */}
          {checklist.items.length > 0 && (
            <div className="space-y-1">
              {checklist.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => onToggle(item.id, item.isCompleted)}
                    disabled={isPending}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[#c57a3a]"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    disabled={isPending}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-40"
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalCount === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No items yet. Add one below.
            </p>
          )}

          {/* Add item inline form */}
          <form
            onSubmit={handleAddItem}
            className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3"
          >
            <Input
              placeholder="New item title..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={addingItem || isPending || !newItemTitle.trim()}
              className="h-8 bg-[#c57a3a] hover:bg-[#b06830] text-white px-3"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ChecklistsPanelClientProps {
  eventId: string
  initialChecklists: ChecklistSerialized[]
}

export function ChecklistsPanelClient({
  eventId,
  initialChecklists,
}: ChecklistsPanelClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // New checklist dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState<ChecklistCategory>("GENERAL")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Aggregate stats ───────────────────────────────────────────────

  const totalItems = initialChecklists.reduce((acc, cl) => {
    const allItems = [...cl.sections.flatMap((s) => s.items), ...cl.items]
    return acc + allItems.length
  }, 0)

  const completedItems = initialChecklists.reduce((acc, cl) => {
    const allItems = [...cl.sections.flatMap((s) => s.items), ...cl.items]
    return acc + allItems.filter((i) => i.isCompleted).length
  }, 0)

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleToggle(itemId: string, currentValue: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(itemId, !currentValue, "admin")
      router.refresh()
    })
  }

  function handleAddItem(checklistId: string, title: string) {
    startTransition(async () => {
      await addChecklistItem(checklistId, { title })
      router.refresh()
    })
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      await deleteChecklistItem(itemId)
      router.refresh()
    })
  }

  async function handleCreateChecklist(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) {
      setFormError("Title is required.")
      return
    }
    setFormError(null)
    setIsSubmitting(true)
    try {
      await createChecklist(eventId, { title: newTitle.trim(), category: newCategory })
      setDialogOpen(false)
      setNewTitle("")
      setNewCategory("GENERAL")
      router.refresh()
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to create checklist.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold text-[#c57a3a]">Checklists</h2>
          <span className="rounded-full bg-[#c57a3a]/10 px-2.5 py-0.5 text-sm font-medium text-[#c57a3a]">
            {initialChecklists.length} lists
          </span>
          {totalItems > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedItems}/{totalItems} items complete
            </span>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="bg-[#c57a3a] hover:bg-[#b06830] text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Checklist
        </Button>
      </div>

      {/* Checklist cards */}
      {initialChecklists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No checklists yet.</p>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="mt-4 bg-[#c57a3a] hover:bg-[#b06830] text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create your first checklist
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {initialChecklists.map((cl) => (
            <ChecklistCard
              key={cl.id}
              checklist={cl}
              onToggle={handleToggle}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* New Checklist Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-[#F7EDDB]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#c57a3a]">
              New Checklist
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateChecklist} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="cl-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cl-title"
                placeholder="Checklist title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="cl-category">Category</Label>
              <Select
                value={newCategory}
                onValueChange={(v) => setNewCategory(v as ChecklistCategory)}
              >
                <SelectTrigger id="cl-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#c57a3a] hover:bg-[#b06830] text-white"
              >
                {isSubmitting ? "Creating..." : "Create Checklist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
