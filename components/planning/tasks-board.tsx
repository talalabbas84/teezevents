"use client"

import { useState, useTransition, useMemo, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import { createTask, updateTaskStatus, deleteTask } from "@/actions/planning"
import { addTaskAttachment } from "@/actions/attachments"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  MultiAssigneeSelect,
  areValidAssignees,
  type TeamMemberOption,
} from "@/components/planning/assignee-select"
import { AttachmentUploader } from "@/components/planning/attachment-uploader"

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
  GripVertical,
  X,
  Paperclip,
} from "lucide-react"

import { TaskDetailDrawer } from "@/components/planning/task-detail-drawer"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ─── Types ────────────────────────────────────────────────────────────────────

type Column = {
  id: TaskStatus
  label: string
  topBorder: string
  dotColor: string
  ringColor: string
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
    ringColor: "ring-slate-400",
    emptyEmoji: "🗒️",
    emptyLabel: "Not Started",
    icon: <Circle className="h-3.5 w-3.5 text-slate-400" />,
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    topBorder: "border-t-blue-500",
    dotColor: "bg-blue-500",
    ringColor: "ring-blue-500",
    emptyEmoji: "⚡",
    emptyLabel: "In Progress",
    icon: <Loader2 className="h-3.5 w-3.5 text-blue-500" />,
  },
  {
    id: "NEEDS_REVIEW",
    label: "Needs Review",
    topBorder: "border-t-yellow-500",
    dotColor: "bg-yellow-500",
    ringColor: "ring-yellow-500",
    emptyEmoji: "👀",
    emptyLabel: "Review",
    icon: <Eye className="h-3.5 w-3.5 text-yellow-500" />,
  },
  {
    id: "BLOCKED",
    label: "Blocked",
    topBorder: "border-t-red-500",
    dotColor: "bg-red-500",
    ringColor: "ring-red-500",
    emptyEmoji: "🚧",
    emptyLabel: "Blocked",
    icon: <Ban className="h-3.5 w-3.5 text-red-500" />,
  },
  {
    id: "COMPLETED",
    label: "Completed",
    topBorder: "border-t-green-500",
    dotColor: "bg-green-500",
    ringColor: "ring-green-500",
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

function getEmailHue(email: string) {
  return Array.from(email).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
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

// ─── Task Mention Textarea ────────────────────────────────────────────────────

function getTaskAvatarColor(member: TeamMemberOption): string {
  return member.avatarColor ?? "#c57a3a"
}

function TaskMentionTextarea({
  value,
  onChange,
  placeholder,
  members,
  rows = 3,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  members: TeamMemberOption[]
  rows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const filteredMembers =
    mentionQuery !== null
      ? members.filter(
          (m) =>
            (m.name ?? "").toLowerCase().includes(mentionQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : []

  function detectMentionAt(currentValue: string, cursorPos: number) {
    const before = currentValue.slice(0, cursorPos)
    const match = before.match(/@([a-zA-Z0-9._%+\-]*)$/)
    if (match) {
      const typed = match[1]
      if (typed.includes("@")) {
        setMentionQuery(null)
        return
      }
      setMentionQuery(typed)
      setMentionStart(cursorPos - typed.length - 1)
      setActiveIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  function insertMention(member: TeamMemberOption) {
    const el = ref.current
    if (!el) return
    const pos = el.selectionStart
    const newVal =
      value.slice(0, mentionStart) + `@${member.email}` + value.slice(pos) + " "
    onChange(newVal)
    setMentionQuery(null)
    setTimeout(() => {
      if (el) {
        const newPos = mentionStart + member.email.length + 2
        el.focus()
        el.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filteredMembers.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredMembers[activeIdx])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }
  }

  // Auto-resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [value])

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          detectMentionAt(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={handleKeyDown}
        onSelect={(e) => {
          const el = e.currentTarget
          detectMentionAt(el.value, el.selectionStart)
        }}
        onKeyUp={(e) => {
          const el = e.currentTarget
          detectMentionAt(el.value, el.selectionStart)
        }}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full resize-none bg-white border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-[#c57a3a]/50 focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/30 focus-visible:ring-[#c57a3a]/40",
          className
        )}
      />
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="absolute z-9999 left-0 top-full mt-1 w-72 rounded-xl border border-border bg-white shadow-xl max-h-60 overflow-y-auto">
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(m)
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors",
                i === activeIdx && "bg-[#c57a3a]/10"
              )}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: getTaskAvatarColor(m) }}
              >
                {(m.name ?? m.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-medium leading-tight truncate">{m.name ?? m.email}</div>
                {m.name && (
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Assignee Avatars ─────────────────────────────────────────────────────────

function AssigneeAvatars({ emails }: { emails: string[] }) {
  if (emails.length === 0) return null
  const shown = emails.slice(0, 3)
  const rest = emails.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((email, i) => {
        const hue = getEmailHue(email)
        return (
          <span
            key={email}
            title={email}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white border border-white",
              i > 0 && "-ml-1.5"
            )}
            style={{ backgroundColor: `hsl(${hue}, 55%, 42%)` }}
          >
            {email.charAt(0).toUpperCase()}
          </span>
        )
      })}
      {rest > 0 && (
        <span className="-ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-200 text-[9px] font-bold text-slate-600">
          +{rest}
        </span>
      )}
    </div>
  )
}

// ─── Task Card Content (shared between sortable card and DragOverlay) ─────────

function TaskCardContent({
  task,
  onStatusChange,
  onDelete,
  onOpen,
  isPending,
  pendingTaskId,
  isDragging = false,
  isOverlay = false,
  dragHandleProps,
}: {
  task: PlanningTaskSerialized
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onDelete?: (taskId: string) => void
  onOpen?: (task: PlanningTaskSerialized) => void
  isPending?: boolean
  pendingTaskId?: string | null
  isDragging?: boolean
  isOverlay?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const transitions = STATUS_TRANSITIONS[task.status] ?? []
  const dueMeta = getDueDateMeta(task.dueDate)
  const completedSubtasks = task.subtasks.filter((s) => s.status === "COMPLETED").length
  const isThisCardPending = isPending && pendingTaskId === task.id
  const taskAssignees =
    task.assigneeEmails.length > 0
      ? task.assigneeEmails
      : task.assignedTo
      ? [task.assignedTo]
      : []

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-white shadow-sm",
        "border-l-4",
        PRIORITY_LEFT_BORDER[task.priority],
        !isOverlay && "transition-shadow hover:shadow-md",
        !isDragging && !isOverlay && "cursor-pointer hover:-translate-y-0.5 transition-all duration-150",
        isDragging && "opacity-40",
        isOverlay && "shadow-2xl rotate-1 cursor-grabbing",
        isThisCardPending && "opacity-60 pointer-events-none"
      )}
      onClick={!isDragging && !isOverlay ? () => onOpen?.(task) : undefined}
    >
      {isThisCardPending && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/40 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-[#c57a3a]" />
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {/* Title row: drag handle + title + delete */}
        <div className="flex items-start gap-1.5">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className={cn(
              "mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/40",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isOverlay && "opacity-100",
              "cursor-grab active:cursor-grabbing hover:text-muted-foreground"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <p className="flex-1 text-sm font-medium leading-snug text-foreground line-clamp-2">
            {task.title}
          </p>

          {!isOverlay && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(task.id)
              }}
              disabled={isPending}
              className="shrink-0 mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-red-50 disabled:opacity-40"
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
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

        {/* Meta: due date + assignees */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {dueMeta && (
              <span className={cn("flex items-center gap-1 text-[11px] font-medium", dueMeta.className)}>
                <dueMeta.Icon className="h-3 w-3" />
                {dueMeta.label}
              </span>
            )}
          </div>
          <AssigneeAvatars emails={taskAssignees} />
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
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              #{task.id.slice(-4)}
            </span>
          </div>
        )}

        {/* Quick status transitions — hidden in overlay */}
        {!isOverlay && transitions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5 border-t border-border/50">
            {transitions.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange?.(task.id, nextStatus)
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

// ─── Sortable Task Card ────────────────────────────────────────────────────────

function SortableTaskCard({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardContent
        task={task}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onOpen={onOpen}
        isPending={isPending}
        pendingTaskId={pendingTaskId}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
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

  // Local task state (for optimistic DnD updates)
  const [tasks, setTasks] = useState<PlanningTaskSerialized[]>(initialTasks)

  // DnD state
  const [activeTask, setActiveTask] = useState<PlanningTaskSerialized | null>(null)
  const [overColumnId, setOverColumnId] = useState<TaskStatus | null>(null)

  // Drawer state
  const [selectedTask, setSelectedTask] = useState<PlanningTaskSerialized | null>(null)

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState("basic")
  const [addDialogDefaultStatus, setAddDialogDefaultStatus] = useState<TaskStatus>("NOT_STARTED")

  // Filter / search state
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL")
  const [dueFilter, setDueFilter] = useState<string>("ALL")

  // Add task form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TaskPriority,
    status: "NOT_STARTED" as TaskStatus,
    category: "",
    dueDate: "",
    assigneeEmails: [] as string[],
  })
  const [fieldErrors, setFieldErrors] = useState<TaskFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ url: string; name: string; mimeType: string; sizeBytes: number }>
  >([])

  // ─── DnD sensors ──────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // ─── Derived data ─────────────────────────────────────────────────

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    tasks.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const now = Date.now()
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000

    return tasks.filter((t) => {
      const taskAssignees =
        t.assigneeEmails.length > 0
          ? t.assigneeEmails
          : t.assignedTo
          ? [t.assignedTo]
          : []
      const dueDate = t.dueDate ? new Date(t.dueDate) : null
      const hasValidDueDate = dueDate !== null && !Number.isNaN(dueDate.getTime())
      const dueTime = hasValidDueDate ? dueDate!.getTime() : null

      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false
      if (assigneeFilter === "ME" && !taskAssignees.includes(adminEmail)) return false
      if (assigneeFilter === "UNASSIGNED" && taskAssignees.length > 0) return false
      if (
        !["ALL", "ME", "UNASSIGNED"].includes(assigneeFilter) &&
        !taskAssignees.includes(assigneeFilter)
      )
        return false
      if (
        dueFilter === "OVERDUE" &&
        (dueTime === null || dueTime >= now || t.status === "COMPLETED")
      )
        return false
      if (
        dueFilter === "THIS_WEEK" &&
        (dueTime === null || dueTime < now || dueTime > weekFromNow)
      )
        return false
      if (dueFilter === "NO_DATE" && hasValidDueDate) return false
      if (q) {
        const haystack =
          `${t.title} ${t.description ?? ""} ${t.category ?? ""} ${taskAssignees.join(" ")}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [adminEmail, tasks, searchQuery, priorityFilter, categoryFilter, assigneeFilter, dueFilter])

  const tasksByStatus = useCallback(
    (status: TaskStatus) => filteredTasks.filter((t) => t.status === status),
    [filteredTasks]
  )

  const totalFiltered = filteredTasks.length
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    priorityFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    assigneeFilter !== "ALL" ||
    dueFilter !== "ALL"
  const dateTimeMin = useMemo(() => getDateTimeInputMin(), [])

  // ─── DnD Handlers ─────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }
    // over could be a column id or a task id — resolve to column
    const overId = over.id as string
    const isColumn = COLUMNS.some((c) => c.id === overId)
    if (isColumn) {
      setOverColumnId(overId as TaskStatus)
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) setOverColumnId(overTask.status)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    setOverColumnId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const draggedTask = tasks.find((t) => t.id === activeId)
    if (!draggedTask) return

    // Resolve target column
    const isOverColumn = COLUMNS.some((c) => c.id === overId)
    const targetStatus: TaskStatus = isOverColumn
      ? (overId as TaskStatus)
      : (tasks.find((t) => t.id === overId)?.status ?? draggedTask.status)

    if (targetStatus === draggedTask.status && activeId === overId) return

    if (targetStatus !== draggedTask.status) {
      // Optimistically update local state
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
      )
      // Also update selectedTask if it's the one being moved
      setSelectedTask((prev) => (prev?.id === activeId ? { ...prev, status: targetStatus } : prev))

      // Call server action
      startTransition(async () => {
        const result = await updateTaskStatus(activeId, targetStatus)
        if (!result.success) {
          // Revert on error
          setTasks((prev) =>
            prev.map((t) =>
              t.id === activeId ? { ...t, status: draggedTask.status } : t
            )
          )
          toast.error("Failed to update task status. Please try again.")
        } else {
          router.refresh()
        }
      })
    } else {
      // Reorder within same column using arrayMove
      const colTaskIds = tasks
        .filter((t) => t.status === targetStatus)
        .map((t) => t.id)
      const oldIndex = colTaskIds.indexOf(activeId)
      const newIndex = colTaskIds.indexOf(overId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedIds = arrayMove(colTaskIds, oldIndex, newIndex)
        setTasks((prev) => {
          const colTasks = prev.filter((t) => t.status === targetStatus)
          const otherTasks = prev.filter((t) => t.status !== targetStatus)
          const reordered = reorderedIds.map((id) => colTasks.find((t) => t.id === id)!)
          return [...otherTasks, ...reordered]
        })
      }
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setPendingTaskId(taskId)
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, status)
      setPendingTaskId(null)
      if (!result.success) {
        toast.error("Failed to update task status.")
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
        router.refresh()
      }
    })
  }

  function handleDelete(taskId: string) {
    setPendingTaskId(taskId)
    startTransition(async () => {
      const result = await deleteTask(taskId)
      setPendingTaskId(null)
      if (!result.success) {
        toast.error("Failed to delete task.")
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        router.refresh()
      }
    })
  }

  function openAddDialog(status: TaskStatus = "NOT_STARTED") {
    setAddDialogDefaultStatus(status)
    setForm((f) => ({ ...f, status }))
    setAddDialogOpen(true)
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
        status: form.status,
        category: form.category.trim() || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        assigneeEmails: form.assigneeEmails,
      })
      if (!result.success) {
        setFormError(result.error ?? "Failed to create task.")
        return
      }
      // Upload any pending attachments
      const taskId = (result.data as { id: string } | undefined)?.id
      if (taskId && pendingAttachments.length > 0) {
        for (const att of pendingAttachments) {
          const attRes = await addTaskAttachment(taskId, att)
          if (!attRes.success) {
            toast.error(`Failed to save attachment: ${att.name}`)
          }
        }
      }
      setAddDialogOpen(false)
      setDialogTab("basic")
      setFieldErrors({})
      setPendingAttachments([])
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "NOT_STARTED",
        category: "",
        dueDate: "",
        assigneeEmails: [],
      })
      toast.success("Task created.")
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
      setPendingAttachments([])
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
            {tasks.length} tasks
          </span>
          {hasActiveFilters && totalFiltered !== tasks.length && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {totalFiltered} shown
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => openAddDialog("NOT_STARTED")}
          className="bg-[#c57a3a] hover:bg-[#b06830] text-white shadow-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* ── Search & filter bar ── */}
      <div className="sticky top-[calc(7rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-wrap items-center gap-2 border-y border-border bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-xl lg:static lg:mx-0 lg:rounded-xl lg:border">
        {/* Search */}
        <div className="relative min-w-full flex-1 sm:min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-base placeholder:text-muted-foreground/70 transition-all focus:border-[#c57a3a]/50 focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/30 sm:text-sm"
          />
        </div>

        {/* Priority filter */}
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as TaskPriority | "ALL")}
        >
          <SelectTrigger className="h-10 min-w-[135px] flex-1 border-border bg-muted/30 text-sm sm:flex-none">
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
          <SelectTrigger className="h-10 min-w-[145px] flex-1 border-border bg-muted/30 text-sm sm:flex-none">
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

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-10 min-w-[135px] flex-1 border-border bg-muted/30 text-sm sm:flex-none">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All assignees</SelectItem>
            <SelectItem value="ME">Assigned to me</SelectItem>
            <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            {assignees.map((member) => (
              <SelectItem key={member.id} value={member.email}>
                {member.name ?? member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dueFilter} onValueChange={setDueFilter}>
          <SelectTrigger className="h-10 min-w-[125px] flex-1 border-border bg-muted/30 text-sm sm:flex-none">
            <SelectValue placeholder="Due" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any due date</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="THIS_WEEK">Next 7 days</SelectItem>
            <SelectItem value="NO_DATE">No due date</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery("")
              setPriorityFilter("ALL")
              setCategoryFilter("ALL")
              setAssigneeFilter("ALL")
              setDueFilter("ALL")
            }}
            className="h-10 rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Kanban board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.id)
            const colTaskIds = colTasks.map((t) => t.id)
            const isOver = overColumnId === col.id

            return (
              <div key={col.id} className="flex flex-col gap-3">
                {/* Column header */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm transition-all duration-150",
                    "border-t-2",
                    col.topBorder,
                    isOver && `ring-2 ${col.ringColor}`
                  )}
                >
                  {col.icon}
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {colTasks.length}
                  </span>
                  <button
                    className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#F7EDDB] hover:text-[#c57a3a]"
                    onClick={() => openAddDialog(col.id)}
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Task cards list — droppable via SortableContext + column id */}
                <SortableContext
                  id={col.id}
                  items={colTaskIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className={cn(
                      "flex min-h-[120px] flex-col gap-2 rounded-xl transition-colors duration-150",
                      isOver && "bg-muted/30"
                    )}
                  >
                    {colTasks.length === 0 ? (
                      <ColumnEmpty col={col} />
                    ) : (
                      colTasks.map((task) => (
                        <SortableTaskCard
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
                </SortableContext>
              </div>
            )
          })}
        </div>

        {/* DragOverlay — full-opacity floating card */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskCardContent
              task={activeTask}
              isOverlay
              dragHandleProps={{}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

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
                  <TaskMentionTextarea
                    value={form.description}
                    onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="Add more context or details… type @ to mention a team member"
                    members={assignees}
                    rows={3}
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

                <div className="space-y-1.5">
                  <Label htmlFor="task-status" className="text-sm font-medium text-foreground">
                    Column
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
                  >
                    <SelectTrigger id="task-status" className="bg-white border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          <span className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", col.dotColor)} />
                            {col.label}
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

                {/* Attachments */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">
                    Attach files
                  </Label>
                  <div className="flex items-center gap-2">
                    <AttachmentUploader
                      compact
                      onUpload={(file) => {
                        setPendingAttachments((prev) => [...prev, file])
                      }}
                    />
                    {pendingAttachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {pendingAttachments.length} file{pendingAttachments.length > 1 ? "s" : ""} ready to attach
                      </span>
                    )}
                  </div>
                  {pendingAttachments.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {pendingAttachments.map((att, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-foreground">{att.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingAttachments((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Remove ${att.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
