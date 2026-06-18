"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  EventBlueprintSerialized,
  TaskPriority,
  ChecklistCategory,
  BudgetCategory,
} from "@/lib/planning/types"
import {
  createBlueprint,
  updateBlueprint,
  addBlueprintTask,
  addBlueprintChecklistItem,
  addBlueprintBudgetItem,
  addBlueprintRunSheetItem,
  addBlueprintTimelineItem,
} from "@/actions/planning"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  CheckSquare,
  ListChecks,
  DollarSign,
  ClipboardList,
  Calendar,
  Save,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  "VENUE",
  "VENDORS",
  "MARKETING",
  "TICKETING",
  "STAFF",
  "PERFORMERS",
  "BUDGET",
  "LEGAL",
  "SOUND_LIGHTS",
  "SECURITY",
  "DECORATIONS",
  "FOOD_DRINKS",
  "DAY_OF_EVENT",
  "POST_EVENT",
  "GENERAL",
]

const BUDGET_CATEGORIES: BudgetCategory[] = [
  "VENUE",
  "DJ_MUSIC",
  "PERFORMERS",
  "STAFF",
  "MARKETING",
  "DECORATIONS",
  "FOOD_DRINKS",
  "SECURITY",
  "EQUIPMENT",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "MISCELLANEOUS",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityColor(p: TaskPriority) {
  switch (p) {
    case "URGENT":
      return "bg-red-100 text-red-700 border-0"
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-0"
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-0"
    default:
      return "bg-stone-100 text-stone-600 border-0"
  }
}

function formatCAD(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewModeNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Save the blueprint first before adding items.
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  mode: "new" | "edit"
  initialBlueprint?: EventBlueprintSerialized
}

export function BlueprintEditorClient({ mode, initialBlueprint }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Header fields
  const [name, setName] = useState(initialBlueprint?.name ?? "")
  const [description, setDescription] = useState(
    initialBlueprint?.description ?? ""
  )
  const [category, setCategory] = useState(initialBlueprint?.category ?? "")
  const [saveError, setSaveError] = useState<string | null>(null)

  // Add-item dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [runSheetDialogOpen, setRunSheetDialogOpen] = useState(false)
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false)

  const blueprintId = initialBlueprint?.id ?? null

  // ── Save / Create ──────────────────────────────────────────────────────────

  function handleSave() {
    if (!name.trim()) {
      setSaveError("Name is required.")
      return
    }
    setSaveError(null)

    startTransition(async () => {
      if (mode === "new") {
        const res = await createBlueprint({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
        })
        if (!res.success) {
          setSaveError(res.error ?? "Failed to create blueprint.")
          return
        }
        router.push(`/admin/blueprints/${(res.data as any).id}/`)
      } else {
        const res = await updateBlueprint(blueprintId!, {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
        })
        if (!res.success) {
          setSaveError(res.error ?? "Failed to save blueprint.")
          return
        }
        router.refresh()
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F7EDDB]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#F7EDDB] border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3">
          {/* Back link + Save */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-stone-600 hover:text-stone-800 -ml-2"
            >
              <Link href="/admin/blueprints">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Blueprints
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              {saveError && (
                <span className="text-xs text-red-600">{saveError}</span>
              )}
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="bg-[#c57a3a] hover:bg-[#a8622e] text-white font-medium"
              >
                <Save className="h-4 w-4 mr-2" />
                {isPending ? "Saving…" : mode === "new" ? "Create Blueprint" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Name */}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Blueprint name…"
            className={cn(
              "font-serif text-xl font-semibold border-0 border-b rounded-none bg-transparent px-0",
              "focus-visible:ring-0 focus-visible:border-[#c57a3a] placeholder:text-stone-400"
            )}
          />

          {/* Description + Category */}
          <div className="flex flex-col md:flex-row gap-3">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)…"
              rows={2}
              className="flex-1 text-sm bg-white/60 border-stone-200 resize-none"
            />
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g. Wedding, Corporate)…"
              className="md:w-64 text-sm bg-white/60 border-stone-200"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <Tabs defaultValue="tasks">
          <TabsList className="bg-white border border-stone-200 mb-6">
            <TabsTrigger value="tasks" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              Checklist Items
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5">
              <DollarSign className="h-4 w-4" />
              Budget Items
            </TabsTrigger>
            <TabsTrigger value="runsheet" className="gap-1.5">
              <ListChecks className="h-4 w-4" />
              Run Sheet
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Timeline Items
            </TabsTrigger>
          </TabsList>

          {/* ── Tasks ── */}
          <TabsContent value="tasks">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-stone-700">
                  Tasks
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!blueprintId) return
                    setTaskDialogOpen(true)
                  }}
                  disabled={!blueprintId}
                  className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {mode === "new" && <NewModeNotice />}

              {(initialBlueprint?.tasks ?? []).length === 0 && mode === "edit" ? (
                <p className="text-stone-400 text-sm">No tasks yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(initialBlueprint?.tasks ?? []).map((task) => (
                    <Card key={task.id} className="bg-white border-stone-200 shadow-none">
                      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800 flex-1 min-w-0 truncate">
                          {task.title}
                        </span>
                        <Badge className={cn("text-xs", priorityColor(task.priority))}>
                          {task.priority}
                        </Badge>
                        {task.category && (
                          <Badge variant="outline" className="text-xs text-stone-500">
                            {task.category}
                          </Badge>
                        )}
                        {"daysBeforeEvent" in task && (task as any).daysBeforeEvent != null && (
                          <span className="text-xs text-stone-400">
                            {(task as any).daysBeforeEvent}d before
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AddTaskDialog
              open={taskDialogOpen}
              onClose={() => setTaskDialogOpen(false)}
              blueprintId={blueprintId!}
              onAdded={() => {
                setTaskDialogOpen(false)
                router.refresh()
              }}
            />
          </TabsContent>

          {/* ── Checklist Items ── */}
          <TabsContent value="checklist">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-stone-700">
                  Checklist Items
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!blueprintId) return
                    setChecklistDialogOpen(true)
                  }}
                  disabled={!blueprintId}
                  className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {mode === "new" && <NewModeNotice />}

              {(initialBlueprint?.checklistItems ?? []).length === 0 && mode === "edit" ? (
                <p className="text-stone-400 text-sm">No checklist items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(initialBlueprint?.checklistItems ?? []).map((item) => (
                    <Card key={item.id} className="bg-white border-stone-200 shadow-none">
                      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800 flex-1 min-w-0 truncate">
                          {item.title}
                        </span>
                        <Badge className={cn("text-xs", priorityColor(item.priority ?? "LOW"))}>
                          {item.priority ?? "LOW"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-[#c57a3a]/10 text-[#c57a3a] border-0"
                        >
                          {item.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AddChecklistItemDialog
              open={checklistDialogOpen}
              onClose={() => setChecklistDialogOpen(false)}
              blueprintId={blueprintId!}
              onAdded={() => {
                setChecklistDialogOpen(false)
                router.refresh()
              }}
            />
          </TabsContent>

          {/* ── Budget Items ── */}
          <TabsContent value="budget">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-stone-700">
                  Budget Items
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!blueprintId) return
                    setBudgetDialogOpen(true)
                  }}
                  disabled={!blueprintId}
                  className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {mode === "new" && <NewModeNotice />}

              {(initialBlueprint?.budgetItems ?? []).length === 0 && mode === "edit" ? (
                <p className="text-stone-400 text-sm">No budget items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(initialBlueprint?.budgetItems ?? []).map((item) => (
                    <Card key={item.id} className="bg-white border-stone-200 shadow-none">
                      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800 flex-1 min-w-0 truncate">
                          {item.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-[#c57a3a]/10 text-[#c57a3a] border-0"
                        >
                          {item.category}
                        </Badge>
                        <span className="text-sm font-semibold text-stone-700">
                          {formatCAD(item.estimatedCents)}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AddBudgetItemDialog
              open={budgetDialogOpen}
              onClose={() => setBudgetDialogOpen(false)}
              blueprintId={blueprintId!}
              onAdded={() => {
                setBudgetDialogOpen(false)
                router.refresh()
              }}
            />
          </TabsContent>

          {/* ── Run Sheet ── */}
          <TabsContent value="runsheet">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-stone-700">
                  Run Sheet
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!blueprintId) return
                    setRunSheetDialogOpen(true)
                  }}
                  disabled={!blueprintId}
                  className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {mode === "new" && <NewModeNotice />}

              {(initialBlueprint?.runSheetItems ?? []).length === 0 && mode === "edit" ? (
                <p className="text-stone-400 text-sm">No run sheet items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(initialBlueprint?.runSheetItems ?? []).map((item) => (
                    <Card key={item.id} className="bg-white border-stone-200 shadow-none">
                      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-mono text-stone-500 w-14 shrink-0">
                          {item.time}
                        </span>
                        <span className="font-medium text-stone-800 flex-1 min-w-0 truncate">
                          {item.title}
                        </span>
                        {item.durationMins != null && (
                          <span className="text-xs text-stone-400">
                            {item.durationMins} min
                          </span>
                        )}
                        {item.description && (
                          <span className="w-full text-xs text-stone-500 truncate">
                            {item.description}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AddRunSheetItemDialog
              open={runSheetDialogOpen}
              onClose={() => setRunSheetDialogOpen(false)}
              blueprintId={blueprintId!}
              onAdded={() => {
                setRunSheetDialogOpen(false)
                router.refresh()
              }}
            />
          </TabsContent>

          {/* ── Timeline Items ── */}
          <TabsContent value="timeline">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-stone-700">
                  Timeline Items
                </h2>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!blueprintId) return
                    setTimelineDialogOpen(true)
                  }}
                  disabled={!blueprintId}
                  className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {mode === "new" && <NewModeNotice />}

              {(initialBlueprint?.timelineItems ?? []).length === 0 && mode === "edit" ? (
                <p className="text-stone-400 text-sm">No timeline items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(initialBlueprint?.timelineItems ?? []).map((item) => (
                    <Card key={item.id} className="bg-white border-stone-200 shadow-none">
                      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-stone-800 flex-1 min-w-0 truncate">
                          {item.title}
                        </span>
                        {item.isMilestone && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                            Milestone
                          </Badge>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="text-xs text-stone-500">
                            {item.category}
                          </Badge>
                        )}
                        <span className="text-xs text-stone-400">
                          {item.daysBeforeEvent}d before
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <AddTimelineItemDialog
              open={timelineDialogOpen}
              onClose={() => setTimelineDialogOpen(false)}
              blueprintId={blueprintId!}
              onAdded={() => {
                setTimelineDialogOpen(false)
                router.refresh()
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Dialog: Add Task ─────────────────────────────────────────────────────────

function AddTaskDialog({
  open,
  onClose,
  blueprintId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  blueprintId: string
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [taskCategory, setTaskCategory] = useState("")
  const [daysBeforeEvent, setDaysBeforeEvent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setPriority("MEDIUM")
    setTaskCategory("")
    setDaysBeforeEvent("")
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addBlueprintTask(blueprintId, {
        title: title.trim(),
        priority,
        category: taskCategory.trim() || undefined,
        daysBeforeEvent: daysBeforeEvent ? parseInt(daysBeforeEvent, 10) : undefined,
      })
      if (!res.success) {
        setError(res.error ?? "Failed to add task.")
        return
      }
      reset()
      onAdded()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#F7EDDB] border-stone-200">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-stone-800">
            Add Task
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Input
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              placeholder="e.g. Venue, Marketing…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Days before event</Label>
            <Input
              type="number"
              value={daysBeforeEvent}
              onChange={(e) => setDaysBeforeEvent(e.target.value)}
              placeholder="e.g. 14"
              className="bg-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
          >
            {isPending ? "Adding…" : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Add Checklist Item ───────────────────────────────────────────────

function AddChecklistItemDialog({
  open,
  onClose,
  blueprintId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  blueprintId: string
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [section, setSection] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM")
  const [itemCategory, setItemCategory] = useState<ChecklistCategory>("GENERAL")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setSection("")
    setPriority("MEDIUM")
    setItemCategory("GENERAL")
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addBlueprintChecklistItem(blueprintId, {
        title: title.trim(),
        section: section.trim() || undefined,
        priority,
        category: itemCategory,
      })
      if (!res.success) {
        setError(res.error ?? "Failed to add item.")
        return
      }
      reset()
      onAdded()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#F7EDDB] border-stone-200">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-stone-800">
            Add Checklist Item
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Section</Label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="Section name (optional)…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={itemCategory}
              onValueChange={(v) => setItemCategory(v as ChecklistCategory)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKLIST_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
          >
            {isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Add Budget Item ──────────────────────────────────────────────────

function AddBudgetItemDialog({
  open,
  onClose,
  blueprintId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  blueprintId: string
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory>("MISCELLANEOUS")
  const [estimatedCAD, setEstimatedCAD] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setBudgetCategory("MISCELLANEOUS")
    setEstimatedCAD("")
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)
    const estimatedCents = estimatedCAD
      ? Math.round(parseFloat(estimatedCAD) * 100)
      : 0
    startTransition(async () => {
      const res = await addBlueprintBudgetItem(blueprintId, {
        title: title.trim(),
        category: budgetCategory,
        estimatedCents,
      })
      if (!res.success) {
        setError(res.error ?? "Failed to add item.")
        return
      }
      reset()
      onAdded()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#F7EDDB] border-stone-200">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-stone-800">
            Add Budget Item
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={budgetCategory}
              onValueChange={(v) => setBudgetCategory(v as BudgetCategory)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Estimated (CAD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={estimatedCAD}
                onChange={(e) => setEstimatedCAD(e.target.value)}
                placeholder="0.00"
                className="bg-white pl-7"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
          >
            {isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Add Run Sheet Item ───────────────────────────────────────────────

function AddRunSheetItemDialog({
  open,
  onClose,
  blueprintId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  blueprintId: string
  onAdded: () => void
}) {
  const [time, setTime] = useState("")
  const [title, setTitle] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [durationMins, setDurationMins] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTime("")
    setTitle("")
    setItemDescription("")
    setDurationMins("")
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addBlueprintRunSheetItem(blueprintId, {
        time: time.trim() || "TBD",
        title: title.trim(),
        description: itemDescription.trim() || undefined,
        durationMins: durationMins ? parseInt(durationMins, 10) : undefined,
      })
      if (!res.success) {
        setError(res.error ?? "Failed to add item.")
        return
      }
      reset()
      onAdded()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#F7EDDB] border-stone-200">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-stone-800">
            Add Run Sheet Item
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Time</Label>
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 7:00 PM"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="bg-white resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              placeholder="e.g. 30"
              className="bg-white"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
          >
            {isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog: Add Timeline Item ────────────────────────────────────────────────

function AddTimelineItemDialog({
  open,
  onClose,
  blueprintId,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  blueprintId: string
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [daysBeforeEvent, setDaysBeforeEvent] = useState("")
  const [timelineCategory, setTimelineCategory] = useState("")
  const [isMilestone, setIsMilestone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setDaysBeforeEvent("")
    setTimelineCategory("")
    setIsMilestone(false)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addBlueprintTimelineItem(blueprintId, {
        title: title.trim(),
        daysBeforeEvent: daysBeforeEvent ? parseInt(daysBeforeEvent, 10) : 0,
        category: timelineCategory.trim() || undefined,
        isMilestone,
      })
      if (!res.success) {
        setError(res.error ?? "Failed to add item.")
        return
      }
      reset()
      onAdded()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#F7EDDB] border-stone-200">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-stone-800">
            Add Timeline Item
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title…"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Days before event</Label>
            <Input
              type="number"
              value={daysBeforeEvent}
              onChange={(e) => setDaysBeforeEvent(e.target.value)}
              placeholder="e.g. 30"
              className="bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Input
              value={timelineCategory}
              onChange={(e) => setTimelineCategory(e.target.value)}
              placeholder="e.g. Venue, Marketing…"
              className="bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isMilestone"
              type="checkbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-[#c57a3a]"
            />
            <Label htmlFor="isMilestone" className="cursor-pointer select-none">
              Mark as milestone
            </Label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#c57a3a] hover:bg-[#a8622e] text-white"
          >
            {isPending ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
