"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import { createTask, updateTaskStatus, deleteTask } from "@/actions/planning"
import { cn } from "@/lib/utils"
import {
  MultiAssigneeSelect,
  areValidAssignees,
  type TeamMemberOption,
} from "@/components/planning/assignee-select"

import { Card } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  Plus,
  Trash2,
  CheckSquare,
  AlertCircle,
  Clock,
  Search,
  Calendar,
  CalendarX,
  CalendarClock,
  MessageSquare,
  ArrowRight,
  Circle,
  Ban,
  Eye,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import { TaskDetailDrawer } from "@/components/planning/task-detail-drawer"

// ─── Types ────────────────────────────────────────────────────────────────────

type Column = {
  id: TaskStatus
  label: string
  topBorder: string
  dotColor: string
  emptyEmoji: string
  emptyLabel: string
  icon: React.ReactNode
}

type TaskFormErrors = Partial<Record<"title" | "assigneeEmails" | "dueDate", string>>

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  {
    id: "NOT_STARTED",
    label: "Not Started",
    topBorder: "border-t-slate-400",
    dotColor: "bg-slate-400",
    emptyEmoji: "🗒️",
    emptyLabel: "Not Started",
    icon: <Circle className="h-3.5 w-3.5 text-slate-400" />,
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    topBorder: "border-t-blue-500",
    dotColor: "bg-blue-500",
    emptyEmoji: "⚡",
    emptyLabel: "In Progress",
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-500" />,
  },
  {
    id: "NEEDS_REVIEW",
    label: "Needs Review",
    topBorder: "border-t-yellow-500",
    dotColor: "bg-yellow-500",
    emptyEmoji: "👀",
    emptyLabel: "Review",
    icon: <Eye className="h-3.5 w-3.5 text-yellow-500" />,
  },
  {
    id: "BLOCKED",
    label: "Blocked",
    topBorder: "border-t-red-500",
    dotColor: "bg-red-500",
    emptyEmoji: "🚧",
    emptyLabel: "Blocked",
    icon: <Ban className="h-3.5 w-3.5 text-red-500" />,
  },
  {
    id: "COMPLETED",
    label: "Completed",
    topBorder: "border-t-green-500",
    dotColor: "bg-green-500",
    emptyEmoji: "✅",
    emptyLabel: "Completed",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  },
]

const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  NEEDS_REVIEW: "Review",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const PRIORITY_LEFT_BORDER: Record<TaskPriority, string> = {
  LOW: "border-l-slate-300",
  MEDIUM: "border-l-blue-400",
  HIGH: "border-l-orange-500",
  URGENT: "border-l-red-500",
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-blue-100 text-blue-600 border-blue-200",
  HIGH: "bg-orange-100 text-orange-600 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  LOW: "bg-slate-300",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
]

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["NEEDS_REVIEW", "COMPLETED", "BLOCKED"],
  NEEDS_REVIEW: ["COMPLETED", "IN_PROGRESS"],
  BLOCKED: ["NOT_STARTED", "IN_PROGRESS"],
  COMPLETED: ["NOT_STARTED"],
  CANCELLED: ["NOT_STARTED"],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDueDateMeta(dueDate: string | null): {
  label: string
  className: string
  Icon: React.ElementType
} | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const now = new Date()
  // Normalize to midnight for day comparisons
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  if (dueDay < today) {
    return { label: formatted, className: "text-red-600", Icon: CalendarX }
  }
  if (dueDay.getTime() === today.getTime() || dueDay.getTime() === tomorrow.getTime()) {
    return { label: formatted, className: "text-orange-600", Icon: CalendarClock }
  }
  if (dueDay < nextWeek) {
    return { label: formatted, className: "text-yellow-600", Icon: Calendar }
  }
  return { label: formatted, className: "text-muted-foreground", Icon: Calendar }
}

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

function AvatarChip({ email }: { email: string }) {
  const letter = email.charAt(0).toUpperCase()
  // Deterministic hue from email string
  const hue = Array.from(email).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: `hsl(${hue}, 55%, 42%)` }}
      title={email}
    >
      {letter}
      <span className="max-w-[80px] truncate opacity-90">{email.split("@")[0]}</span>
    </span>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onOpen,
  isPending,
  pendingTaskId,
}: {
  task: PlanningTaskSerialized
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  onOpen: (task: PlanningTaskSerialized) => void
  isPending: boolean
  pendingTaskId: string | null
}) {
  const transitions = STATUS_TRANSITIONS[task.status] ?? []
  const dueMeta = getDueDateMeta(task.dueDate)
  const completedSubtasks = task.subtasks.filter((s) => s.status === "COMPLETED").length
  const isThisCardPending = isPending && pendingTaskId === task.id

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-white shadow-sm",
        "cursor-pointer transition-all duration-150",
        "hover:shadow-md hover:-translate-y-0.5",
        "border-l-4",
        PRIORITY_LEFT_BORDER[task.priority],
        isThisCardPending && "opacity-60 pointer-events-none"
      )}
      onClick={() => onOpen(task)}
    >
      {/* Pending overlay spinner */}
      {isThisCardPending && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/40 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#c57a3a]" />
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {/* Title row + delete */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2 flex-1">
            {task.title}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task.id)
            }}
            disabled={isPending}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-red-50 disabled:opacity-40"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Priority + Category badges */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              PRIORITY_BADGE[task.priority]
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
            {task.priority}
          </span>
          {task.category && (
            <span className="rounded-full bg-[#F7EDDB] px-2 py-0.5 text-[10px] font-medium text-[#c57a3a] border border-[#c57a3a]/20">
              {task.category}
            </span>
          )}
        </div>

        {/* Meta: due date + assignee */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {dueMeta && (
            <span className={cn("flex items-center gap-1 text-[11px] font-medium", dueMeta.className)}>
              <dueMeta.Icon className="h-3 w-3" />
              {dueMeta.label}
            </span>
          )}
          {(task.assigneeEmails.length > 0 ? task.assigneeEmails : task.assignedTo ? [task.assignedTo] : []).map((email) => (
            <AvatarChip key={email} email={email} />
          ))}
        </div>

        {/* Subtasks + Comments row */}
        {(task.subtasks.length > 0 || task.commentCount > 0) && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {task.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {completedSubtasks}/{task.subtasks.length}
              </span>
            )}
            {task.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task.commentCount}
              </span>
            )}
          </div>
        )}

        {/* Quick status transitions */}
        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5 border-t border-border/50">
            {transitions.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(task.id, nextStatus)
                }}
                disabled={isPending}
                className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-[#F7EDDB] hover:text-[#c57a3a] hover:border-[#c57a3a]/30 disabled:opacity-50"
              >
                <ArrowRight className="h-2.5 w-2.5" />
                {STATUS_LABEL[nextStatus]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Column Empty State ───────────────────────────────────────────────────────

function ColumnEmpty({ col }: { col: Column }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 bg-muted/20 py-10 text-center">
      <span className="text-2xl" role="img" aria-label={col.emptyLabel}>
        {col.emptyEmoji}
      </span>
      <p className="text-xs font-medium text-muted-foreground">No {col.emptyLabel} tasks</p>
      <p className="text-[11px] text-muted-foreground/60">Drop tasks here or create a new one</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TasksBoardClientProps {
  eventId: string
  initialTasks: PlanningTaskSerialized[]
  adminEmail: string
  assignees: TeamMemberOption[]
}

export function TasksBoardClient({
  eventId,
  initialTasks,
  adminEmail,
  assignees,
}: TasksBoardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

  // Drawer state
  const [selectedTask, setSelectedTask] = useState<PlanningTaskSerialized | null>(null)

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState("basic")

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  // Add task form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TaskPriority,
    category: "",
    dueDate: "",
    assigneeEmails: [] as string[],
  })
  const [fieldErrors, setFieldErrors] = useState<TaskFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Derived data ─────────────────────────────────────────────────

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    initialTasks.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [initialTasks])

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return initialTasks.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q)
        const inDesc = t.description?.toLowerCase().includes(q) ?? false
        if (!inTitle && !inDesc) return false
      }
      return true
    })
  }, [initialTasks, searchQuery, priorityFilter, categoryFilter])

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status)

  const totalFiltered = filteredTasks.length
  const hasActiveFilters =
    searchQuery.trim() !== "" || priorityFilter !== "ALL" || categoryFilter !== "ALL"
  const dateTimeMin = useMemo(() => getDateTimeInputMin(), [])

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setPendingTaskId(taskId)
    startTransition(async () => {
      await updateTaskStatus(taskId, status)
      setPendingTaskId(null)
      router.refresh()
    })
  }

  function handleDelete(taskId: string) {
    setPendingTaskId(taskId)
    startTransition(async () => {
      await deleteTask(taskId)
      setPendingTaskId(null)
      router.refresh()
    })
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: TaskFormErrors = {}

    if (!form.title.trim()) {
      nextErrors.title = "Task title is required."
    }

    if (!areValidAssignees(form.assigneeEmails, assignees)) {
      nextErrors.assigneeEmails = "Select collaborators from the team list."
    }

    if (form.dueDate) {
      if (!isValidDateTimeInput(form.dueDate)) {
        nextErrors.dueDate = "Enter a valid due date and time."
      } else if (new Date(form.dueDate).getTime() < Date.now() - 60_000) {
        nextErrors.dueDate = "Due date and time cannot be in the past."
      }
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setFormError(null)
    setIsSubmitting(true)
    try {
      const result = await createTask(eventId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        assigneeEmails: form.assigneeEmails,
      })
      if (!result.success) {
        setFormError(result.error ?? "Failed to create task.")
        return
      }
      setAddDialogOpen(false)
      setDialogTab("basic")
      setFieldErrors({})
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        category: "",
        dueDate: "",
        assigneeEmails: [],
      })
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task."
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setAddDialogOpen(false)
      setDialogTab("basic")
      setFormError(null)
      setFieldErrors({})
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Board header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-xl font-semibold text-[#c57a3a]">Task Board</h2>
          <span className="rounded-full bg-[#c57a3a]/10 px-2.5 py-0.5 text-sm font-medium text-[#c57a3a]">
            {initialTasks.length} tasks
          </span>
          {hasActiveFilters && totalFiltered !== initialTasks.length && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {totalFiltered} shown
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="bg-[#c57a3a] hover:bg-[#b06830] text-white shadow-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* ── Search & filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/30 focus:border-[#c57a3a]/50 transition-all"
          />
        </div>

        {/* Priority filter */}
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as TaskPriority | "ALL")}
        >
          <SelectTrigger className="w-36 h-9 text-sm border-border bg-muted/30">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[p.value])} />
                  {p.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-9 text-sm border-border bg-muted/30">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery("")
              setPriorityFilter("ALL")
              setCategoryFilter("ALL")
            }}
            className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Kanban board ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.id)
          const completedInCol =
            col.id === "COMPLETED"
              ? colTasks.length
              : colTasks.filter((t) => t.status === "COMPLETED").length

          return (
            <div key={col.id} className="flex flex-col gap-3">
              {/* Column header */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm",
                  "border-t-2",
                  col.topBorder
                )}
              >
                {col.icon}
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards list */}
              <div className="flex min-h-[120px] flex-col gap-2">
                {colTasks.length === 0 ? (
                  <ColumnEmpty col={col} />
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onOpen={setSelectedTask}
                      isPending={isPending}
                      pendingTaskId={pendingTaskId}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Task Detail Drawer ── */}
      <TaskDetailDrawer
        task={selectedTask}
        eventId={eventId}
        session={{ email: adminEmail }}
        assignees={assignees}
        onClose={() => setSelectedTask(null)}
      />

      {/* ── Add Task Dialog ── */}
      <Dialog open={addDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg bg-[#F7EDDB] border-[#c57a3a]/20">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#c57a3a]">
              Add New Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddTask}>
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
              <TabsList className="w-full mb-4 bg-[#c57a3a]/10 border border-[#c57a3a]/20">
                <TabsTrigger
                  value="basic"
                  className="flex-1 data-[state=active]:bg-[#c57a3a] data-[state=active]:text-white text-sm"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="flex-1 data-[state=active]:bg-[#c57a3a] data-[state=active]:text-white text-sm"
                >
                  Details
                </TabsTrigger>
              </TabsList>

              {/* Basic Info tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="task-title" className="text-sm font-medium text-foreground">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="task-title"
                    placeholder="What needs to be done?"
                    value={form.title}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, title: e.target.value }))
                      setFieldErrors((errors) => ({ ...errors, title: undefined }))
                    }}
                    className="bg-white border-border focus-visible:ring-[#c57a3a]/40"
                    aria-invalid={Boolean(fieldErrors.title)}
                    required
                  />
                  <FieldError message={fieldErrors.title} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-desc" className="text-sm font-medium text-foreground">
                    Description
                  </Label>
                  <Textarea
                    id="task-desc"
                    placeholder="Add more context or details..."
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="bg-white border-border focus-visible:ring-[#c57a3a]/40 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-priority" className="text-sm font-medium text-foreground">
                    Priority
                  </Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger id="task-priority" className="bg-white border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[p.value])} />
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Details tab */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="task-category" className="text-sm font-medium text-foreground">
                    Category
                  </Label>
                  <Input
                    id="task-category"
                    placeholder="e.g. Venue, Marketing, Staff"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="bg-white border-border focus-visible:ring-[#c57a3a]/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-assigned" className="text-sm font-medium text-foreground">
                    Collaborators
                  </Label>
                  <MultiAssigneeSelect
                    value={form.assigneeEmails}
                    members={assignees}
                    onChange={(value) => {
                      setForm((f) => ({ ...f, assigneeEmails: value }))
                      setFieldErrors((errors) => ({ ...errors, assigneeEmails: undefined }))
                    }}
                    disabled={isSubmitting}
                  />
                  <FieldError message={fieldErrors.assigneeEmails} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-due" className="text-sm font-medium text-foreground">
                    Due Date &amp; Time
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="task-due"
                      type="datetime-local"
                      min={dateTimeMin}
                      value={form.dueDate}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, dueDate: e.target.value }))
                        setFieldErrors((errors) => ({ ...errors, dueDate: undefined }))
                      }}
                      className="bg-white border-border pl-9 focus-visible:ring-[#c57a3a]/40"
                      aria-invalid={Boolean(fieldErrors.dueDate)}
                    />
                  </div>
                  <FieldError message={fieldErrors.dueDate} />
                </div>
              </TabsContent>
            </Tabs>

            {formError && (
              <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}

            <DialogFooter className="mt-5 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={isSubmitting}
                className="border-[#c57a3a]/30 text-[#c57a3a] hover:bg-[#c57a3a]/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#c57a3a] hover:bg-[#b06830] text-white min-w-[110px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
