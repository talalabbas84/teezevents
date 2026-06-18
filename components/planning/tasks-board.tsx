"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import { createTask, updateTaskStatus, deleteTask } from "@/actions/planning"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

import {
  Plus,
  Trash2,
  GripVertical,
  CheckSquare,
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Column = {
  id: TaskStatus
  label: string
  colorClass: string
  icon: React.ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: Column[] = [
  {
    id: "NOT_STARTED",
    label: "Not Started",
    colorClass: "bg-gray-400",
    icon: <Clock className="h-4 w-4 text-gray-500" />,
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    colorClass: "bg-blue-500",
    icon: <GripVertical className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "COMPLETED",
    label: "Completed",
    colorClass: "bg-green-500",
    icon: <CheckSquare className="h-4 w-4 text-green-500" />,
  },
  {
    id: "BLOCKED",
    label: "Blocked",
    colorClass: "bg-red-500",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
  },
]

const STATUS_BADGE_VARIANTS: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-400 border-gray-200",
}

const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, string> = {
  LOW: "bg-gray-100 text-gray-500 border-gray-200",
  MEDIUM: "bg-blue-100 text-blue-600 border-blue-200",
  HIGH: "bg-orange-100 text-orange-600 border-orange-200",
  URGENT: "bg-red-100 text-red-700 border-red-200",
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  isPending,
}: {
  task: PlanningTaskSerialized
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onDelete: (taskId: string) => void
  isPending: boolean
}) {
  const transitions = STATUS_TRANSITIONS[task.status] ?? []

  return (
    <div className="group rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          disabled={isPending}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-40"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Priority + category */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_BADGE_VARIANTS[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.category && (
          <span className="rounded-full bg-[#F7EDDB] px-2 py-0.5 text-[11px] text-[#c57a3a]">
            {task.category}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
        {task.assignedTo && (
          <div className="truncate">
            <span className="font-medium">Assigned:</span> {task.assignedTo}
          </div>
        )}
        {task.subtasks.length > 0 && (
          <div className="flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            <span>
              {task.subtasks.filter((s) => s.status === "COMPLETED").length}/
              {task.subtasks.length} subtasks
            </span>
          </div>
        )}
      </div>

      {/* Quick status transitions */}
      {transitions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {transitions.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => onStatusChange(task.id, nextStatus)}
              disabled={isPending}
              className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              → {nextStatus.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TasksBoardClientProps {
  eventId: string
  initialTasks: PlanningTaskSerialized[]
}

export function TasksBoardClient({ eventId, initialTasks }: TasksBoardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL")

  // Add task form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TaskPriority,
    category: "",
    dueDate: "",
    assignedTo: "",
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Derived data ─────────────────────────────────────────────────

  const filteredTasks =
    priorityFilter === "ALL"
      ? initialTasks
      : initialTasks.filter((t) => t.priority === priorityFilter)

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status)

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      await updateTaskStatus(taskId, status)
      router.refresh()
    })
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteTask(taskId)
      router.refresh()
    })
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setFormError("Title is required.")
      return
    }
    setFormError(null)
    setIsSubmitting(true)
    try {
      await createTask(eventId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        assignedTo: form.assignedTo.trim() || undefined,
      })
      setAddDialogOpen(false)
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        category: "",
        dueDate: "",
        assignedTo: "",
      })
      router.refresh()
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to create task.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold text-[#c57a3a]">Task Board</h2>
          <span className="rounded-full bg-[#c57a3a]/10 px-2.5 py-0.5 text-sm font-medium text-[#c57a3a]">
            {initialTasks.length} tasks
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as TaskPriority | "ALL")}
          >
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add task */}
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-[#c57a3a] hover:bg-[#b06830] text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.id)
          return (
            <div key={col.id} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${col.colorClass}`} />
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex min-h-[120px] flex-col gap-2">
                {colTasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8 text-xs text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      isPending={isPending}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg bg-[#F7EDDB]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#c57a3a]">
              Add New Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddTask} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                placeholder="Optional description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Priority + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                >
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-category">Category</Label>
                <Input
                  id="task-category"
                  placeholder="e.g. Venue"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>

            {/* Due date + Assigned to row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-assigned">Assigned To</Label>
                <Input
                  id="task-assigned"
                  placeholder="Email or name"
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                />
              </div>
            </div>

            {formError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#c57a3a] hover:bg-[#b06830] text-white"
              >
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
