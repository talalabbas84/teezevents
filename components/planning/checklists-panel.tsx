"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { ChecklistSerialized, ChecklistCategory, ChecklistItemSerialized, TaskPriority } from "@/lib/planning/types"
import {
  createChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/actions/planning"
import { cn } from "@/lib/utils"
import {
  AssigneeSelect,
  isValidAssignee,
  type TeamMemberOption,
} from "@/components/planning/assignee-select"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"

import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react"

type ChecklistItemInput = {
  title: string
  assignedTo?: string
  dueDate?: Date
  priority?: TaskPriority
}

type ChecklistItemForm = {
  title: string
  assignedTo: string
  dueDate: string
  priority: TaskPriority
}

type ChecklistItemFormErrors = Partial<Record<keyof ChecklistItemForm, string>>

// ─── Category config ──────────────────────────────────────────────────────────

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

const CATEGORY_ICONS: Record<ChecklistCategory, string> = {
  VENUE: "🏛️",
  VENDORS: "🤝",
  MARKETING: "📣",
  TICKETING: "🎟️",
  STAFF: "👥",
  PERFORMERS: "🎤",
  BUDGET: "💰",
  LEGAL: "⚖️",
  SOUND_LIGHTS: "🔊",
  SECURITY: "🛡️",
  DECORATIONS: "💐",
  FOOD_DRINKS: "🍽️",
  DAY_OF_EVENT: "📅",
  POST_EVENT: "✅",
  GENERAL: "📋",
}

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

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ChecklistCategory[]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; className: string }[] = [
  { value: "LOW", label: "Low", className: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "MEDIUM", label: "Medium", className: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "HIGH", label: "High", className: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "URGENT", label: "Urgent", className: "bg-red-100 text-red-700 border-red-200" },
]

const PRIORITY_BY_VALUE = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option]),
) as Record<TaskPriority, (typeof PRIORITY_OPTIONS)[number]>

function getDateTimeInputMin() {
  const now = new Date()
  now.setSeconds(0, 0)
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function isValidDateTimeInput(value: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()))
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  )
}

function formatDueDate(dueDate: string) {
  return new Date(dueDate).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  isPending,
}: {
  item: ChecklistItemSerialized
  onToggle: (itemId: string, currentValue: boolean) => void
  onDelete: (itemId: string) => void
  isPending: boolean
}) {
  const priority = PRIORITY_BY_VALUE[item.priority]
  const isOverdue =
    item.dueDate && !item.isCompleted ? new Date(item.dueDate).getTime() < Date.now() : false

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-[#F7EDDB]/50">
      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={() => onToggle(item.id, item.isCompleted)}
        disabled={isPending}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#c57a3a]"
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm transition-all",
            item.isCompleted ? "line-through text-muted-foreground" : "text-foreground",
          )}
        >
          {item.title}
        </span>
        {(item.assignedTo || item.dueDate || item.priority !== "MEDIUM") && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {item.assignedTo && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                {item.assignedTo}
              </span>
            )}
            {item.dueDate && (
              <span className={cn("inline-flex items-center gap-1", isOverdue && "font-medium text-red-600")}>
                <CalendarClock className="h-3 w-3" />
                {formatDueDate(item.dueDate)}
              </span>
            )}
            {priority && item.priority !== "MEDIUM" && (
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", priority.className)}>
                {priority.label}
              </span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(item.id)}
        disabled={isPending}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-40"
        aria-label="Delete item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Checklist card ───────────────────────────────────────────────────────────

function ChecklistCard({
  checklist,
  onToggle,
  onAddItem,
  onDeleteItem,
  assignees,
  isPending,
}: {
  checklist: ChecklistSerialized
  onToggle: (itemId: string, currentValue: boolean) => void
  onAddItem: (checklistId: string, data: ChecklistItemInput) => Promise<{ success: boolean; error?: string }>
  onDeleteItem: (itemId: string) => void
  assignees: TeamMemberOption[]
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [itemForm, setItemForm] = useState<ChecklistItemForm>({
    title: "",
    assignedTo: "",
    dueDate: "",
    priority: "MEDIUM",
  })
  const [itemErrors, setItemErrors] = useState<ChecklistItemFormErrors>({})
  const [addError, setAddError] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const dateTimeMin = getDateTimeInputMin()

  const allItems = [
    ...checklist.sections.flatMap((s) => s.items),
    ...checklist.items,
  ]
  const completedCount = allItems.filter((i) => i.isCompleted).length
  const totalCount = allItems.length
  const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: ChecklistItemFormErrors = {}
    const title = itemForm.title.trim()

    if (!title) nextErrors.title = "Item title is required."
    if (itemForm.assignedTo && !isValidAssignee(itemForm.assignedTo, assignees)) {
      nextErrors.assignedTo = "Select a team member from the list."
    }
    if (itemForm.dueDate) {
      if (!isValidDateTimeInput(itemForm.dueDate)) {
        nextErrors.dueDate = "Enter a valid due date and time."
      } else if (new Date(itemForm.dueDate).getTime() < Date.now() - 60_000) {
        nextErrors.dueDate = "Due date and time cannot be in the past."
      }
    }

    setItemErrors(nextErrors)
    setAddError(null)
    if (Object.keys(nextErrors).length > 0) return

    setAddingItem(true)
    try {
      const result = await onAddItem(checklist.id, {
        title,
        assignedTo: itemForm.assignedTo || undefined,
        dueDate: itemForm.dueDate ? new Date(itemForm.dueDate) : undefined,
        priority: itemForm.priority,
      })
      if (!result.success) {
        setAddError(result.error ?? "Failed to add checklist item.")
        return
      }
      setItemForm({ title: "", assignedTo: "", dueDate: "", priority: "MEDIUM" })
      setItemErrors({})
    } finally {
      setAddingItem(false)
    }
  }

  return (
    <Card className="border-[#c57a3a]/15 bg-white shadow-sm overflow-hidden">
      {/* Sticky header */}
      <CardHeader
        className="sticky top-0 z-10 bg-white pb-2 border-b border-[#c57a3a]/10 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="font-serif text-base font-semibold text-foreground">
                {checklist.title}
              </CardTitle>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  CATEGORY_BADGE_COLORS[checklist.category]
                )}
              >
                <span>{CATEGORY_ICONS[checklist.category]}</span>
                {CATEGORY_LABELS[checklist.category]}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-3">
              <Progress
                value={pct}
                className="h-1.5 flex-1 bg-muted [&>div]:bg-[#c57a3a]"
              />
              <span className="shrink-0 text-xs text-muted-foreground">
                {completedCount}/{totalCount}
                {totalCount > 0 && (
                  <span className="ml-1 text-[#c57a3a] font-medium">({pct}%)</span>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-3">
          {/* Sectioned items */}
          {checklist.sections.map((section) => {
            const sectionCompleted = section.items.filter((i) => i.isCompleted).length
            const sectionTotal = section.items.length
            return (
              <div key={section.id} className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  {sectionTotal > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {sectionCompleted}/{sectionTotal}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={onToggle}
                      onDelete={onDeleteItem}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Root items (no section) */}
          {checklist.items.length > 0 && (
            <div className="space-y-0.5">
              {checklist.items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDeleteItem}
                  isPending={isPending}
                />
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
            className="mt-3 space-y-3 border-t border-[#c57a3a]/10 pt-3"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label htmlFor={`checklist-item-title-${checklist.id}`} className="text-xs font-medium">
                  Item <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`checklist-item-title-${checklist.id}`}
                  placeholder="Add item..."
                  value={itemForm.title}
                  onChange={(e) => {
                    setItemForm((form) => ({ ...form, title: e.target.value }))
                    setItemErrors((errors) => ({ ...errors, title: undefined }))
                  }}
                  aria-invalid={Boolean(itemErrors.title)}
                  className="h-9 bg-white text-sm"
                />
                <FieldError message={itemErrors.title} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Assignee</Label>
                <AssigneeSelect
                  value={itemForm.assignedTo}
                  members={assignees}
                  onChange={(value) => {
                    setItemForm((form) => ({ ...form, assignedTo: value }))
                    setItemErrors((errors) => ({ ...errors, assignedTo: undefined }))
                  }}
                  disabled={addingItem || isPending}
                />
                <FieldError message={itemErrors.assignedTo} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
              <div className="space-y-1.5">
                <Label htmlFor={`checklist-item-due-${checklist.id}`} className="text-xs font-medium">
                  Due Date &amp; Time
                </Label>
                <Input
                  id={`checklist-item-due-${checklist.id}`}
                  type="datetime-local"
                  min={dateTimeMin}
                  value={itemForm.dueDate}
                  onChange={(e) => {
                    setItemForm((form) => ({ ...form, dueDate: e.target.value }))
                    setItemErrors((errors) => ({ ...errors, dueDate: undefined }))
                  }}
                  aria-invalid={Boolean(itemErrors.dueDate)}
                  className="h-9 bg-white text-sm"
                />
                <FieldError message={itemErrors.dueDate} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Select
                  value={itemForm.priority}
                  onValueChange={(value) => setItemForm((form) => ({ ...form, priority: value as TaskPriority }))}
                  disabled={addingItem || isPending}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addingItem || isPending || !itemForm.title.trim()}
                  className="h-9 w-full bg-[#c57a3a] px-3 text-white hover:bg-[#b06830] md:w-auto"
                >
                  {addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {addError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {addError}
              </p>
            )}
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
  currentEmail: string
  assignees: TeamMemberOption[]
}

export function ChecklistsPanelClient({
  eventId,
  initialChecklists,
  currentEmail,
  assignees,
}: ChecklistsPanelClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // New checklist dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState<ChecklistCategory>("GENERAL")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<ChecklistCategory | "ALL">("ALL")

  // ─── Aggregate stats ───────────────────────────────────────────────

  const totalItems = initialChecklists.reduce((acc, cl) => {
    const allItems = [...cl.sections.flatMap((s) => s.items), ...cl.items]
    return acc + allItems.length
  }, 0)

  const completedItems = initialChecklists.reduce((acc, cl) => {
    const allItems = [...cl.sections.flatMap((s) => s.items), ...cl.items]
    return acc + allItems.filter((i) => i.isCompleted).length
  }, 0)

  const remainingItems = totalItems - completedItems
  const overallPct = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)

  // ─── Filtered checklists ───────────────────────────────────────────

  const filteredChecklists =
    categoryFilter === "ALL"
      ? initialChecklists
      : initialChecklists.filter((cl) => cl.category === categoryFilter)

  // ─── Active categories (only show tabs for categories that exist) ──

  const activeCategories = ALL_CATEGORIES.filter((cat) =>
    initialChecklists.some((cl) => cl.category === cat)
  )

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleToggle(itemId: string, currentValue: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(itemId, !currentValue, currentEmail)
      router.refresh()
    })
  }

  async function handleAddItem(checklistId: string, data: ChecklistItemInput) {
    const result = await addChecklistItem(checklistId, data)
    if (result.success) {
      router.refresh()
    }
    return { success: result.success, error: result.error }
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
      const result = await createChecklist(eventId, { title: newTitle.trim(), category: newCategory })
      if (!result.success) {
        setFormError(result.error ?? "Failed to create checklist.")
        return
      }
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
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#c57a3a]">Checklists</h2>
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

      {/* Stats bar */}
      {initialChecklists.length > 0 && (
        <div className="rounded-xl border border-[#c57a3a]/20 bg-[#F7EDDB]/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-medium text-foreground">
              {initialChecklists.length} {initialChecklists.length === 1 ? "checklist" : "checklists"}
            </span>
            <span className="text-muted-foreground">
              {totalItems} total items
            </span>
            <span className="text-green-700 font-medium">
              {completedItems} completed
              {totalItems > 0 && (
                <span className="ml-1 text-green-600">({overallPct}%)</span>
              )}
            </span>
            <span className="text-amber-700">
              {remainingItems} remaining
            </span>
          </div>
          {totalItems > 0 && (
            <Progress
              value={overallPct}
              className="h-2 bg-[#c57a3a]/15 [&>div]:bg-[#c57a3a]"
            />
          )}
        </div>
      )}

      {/* Category filter tabs */}
      {activeCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "ALL"
                ? "bg-[#c57a3a] text-white border-[#c57a3a]"
                : "bg-white border-[#c57a3a]/20 text-[#c57a3a] hover:bg-[#F7EDDB]"
            )}
          >
            All ({initialChecklists.length})
          </button>
          {activeCategories.map((cat) => {
            const count = initialChecklists.filter((cl) => cl.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-[#c57a3a] text-white border-[#c57a3a]"
                    : cn("bg-white hover:opacity-80", CATEGORY_BADGE_COLORS[cat])
                )}
              >
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Checklist cards */}
      {initialChecklists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mb-3 rounded-full bg-[#F7EDDB] p-4">
            <ClipboardList className="h-8 w-8 text-[#c57a3a]/60" />
          </div>
          <p className="text-base font-medium text-foreground">No checklists yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create checklists to keep your event planning on track.
          </p>
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
          {filteredChecklists.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No checklists in this category.
            </p>
          ) : (
            filteredChecklists.map((cl) => (
              <ChecklistCard
                key={cl.id}
                checklist={cl}
                onToggle={handleToggle}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                assignees={assignees}
                isPending={isPending}
              />
            ))
          )}
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
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
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
