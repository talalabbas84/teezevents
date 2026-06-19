"use client"

import { useState, useTransition, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MoreHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, Ghost } from "lucide-react"

import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import type { TeamMemberOption } from "@/components/planning/assignee-select"
import { TaskDetailDrawer } from "@/components/planning/task-detail-drawer"
import { updateTaskStatus, deleteTask } from "@/actions/planning"
import { cn } from "@/lib/utils"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TasksListViewProps {
  tasks: PlanningTaskSerialized[]
  eventId: string
  currentUserEmail: string
  teamMembers: Array<{ email: string; name: string | null; avatarColor: string | null }>
  assignees: TeamMemberOption[]
}

type SortState = { column: string | null; dir: "asc" | "desc" }

// ─── Display maps ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  NEEDS_REVIEW: "Needs Review",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-700 border-yellow-200",
  BLOCKED: "bg-red-100 text-red-700 border-red-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-400 border-gray-200",
}

const PRIORITY_CONFIG: Record<TaskPriority, { dot: string; label: string }> = {
  LOW: { dot: "bg-slate-300", label: "Low" },
  MEDIUM: { dot: "bg-blue-400", label: "Medium" },
  HIGH: { dot: "bg-orange-500", label: "High" },
  URGENT: { dot: "bg-red-500", label: "Urgent" },
}

const ALL_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarColorFromEmail(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 48%)`
}

function getInitials(email: string, name?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getDueDateChipClasses(dateStr: string | null, status: TaskStatus): string | null {
  if (!dateStr) return null
  const now = new Date()
  const due = new Date(dateStr)
  if (status === "COMPLETED" || status === "CANCELLED") return null

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.floor((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "text-red-600 bg-red-50 rounded-full px-2 py-0.5 text-xs"
  if (diffDays === 0) return "text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 text-xs"
  if (diffDays <= 7) return "text-yellow-700 bg-yellow-50 rounded-full px-2 py-0.5 text-xs"
  return "text-muted-foreground text-xs"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ column, sort }: { column: string; sort: SortState }) {
  if (sort.column !== column) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-40" />
  return sort.dir === "asc"
    ? <ChevronUp className="ml-1 inline h-3 w-3" />
    : <ChevronDown className="ml-1 inline h-3 w-3" />
}

interface AvatarsProps {
  emails: string[]
  teamMembers: Array<{ email: string; name: string | null; avatarColor: string | null }>
}

function Avatars({ emails, teamMembers }: AvatarsProps) {
  if (!emails.length) return <span className="text-muted-foreground text-xs">—</span>

  const visible = emails.slice(0, 3)
  const overflow = emails.length - 3

  return (
    <div className="flex items-center">
      {visible.map((email, i) => {
        const member = teamMembers.find((m) => m.email === email)
        const color = member?.avatarColor ?? getAvatarColorFromEmail(email)
        const initials = getInitials(email, member?.name)
        return (
          <div
            key={email}
            title={member?.name ?? email}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white",
              i > 0 && "-ml-2"
            )}
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
        )
      })}
      {overflow > 0 && (
        <div
          className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-400 text-[10px] font-bold text-white"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TasksListView({
  tasks: initialTasks,
  eventId,
  currentUserEmail,
  teamMembers,
  assignees,
}: TasksListViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local task state for optimistic updates
  const [tasks, setTasks] = useState<PlanningTaskSerialized[]>(initialTasks)

  // Sort state
  const [sort, setSort] = useState<SortState>({ column: null, dir: "asc" })

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Drawer
  const [selectedTask, setSelectedTask] = useState<PlanningTaskSerialized | null>(null)

  // ── Sorting ────────────────────────────────────────────────────────────────

  const toggleSort = useCallback((column: string) => {
    setSort((prev) =>
      prev.column === column
        ? { column, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column, dir: "asc" }
    )
  }, [])

  const sortedTasks = useMemo(() => {
    if (!sort.column) return tasks

    return [...tasks].sort((a, b) => {
      let cmp = 0

      if (sort.column === "priority") {
        const order: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }
        cmp = (order[a.priority] ?? 0) - (order[b.priority] ?? 0)
      } else if (sort.column === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        cmp = da - db
      } else if (sort.column === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sort.column === "status") {
        cmp = a.status.localeCompare(b.status)
      } else if (sort.column === "category") {
        cmp = (a.category ?? "").localeCompare(b.category ?? "")
      }

      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [tasks, sort])

  // ── Selection ──────────────────────────────────────────────────────────────

  const allVisibleIds = useMemo(() => sortedTasks.map((t) => t.id), [sortedTasks])
  const allChecked = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id))
  const someChecked = allVisibleIds.some((id) => selected.has(id)) && !allChecked

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allVisibleIds))
    }
  }

  // ── Status change ──────────────────────────────────────────────────────────

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const prev = tasks.find((t) => t.id === taskId)
    if (!prev) return

    // Optimistic
    setTasks((ts) =>
      ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, newStatus)
      if (result && "error" in result) {
        toast.error("Failed to update status")
        // Revert
        setTasks((ts) =>
          ts.map((t) => (t.id === taskId ? { ...t, status: prev.status } : t))
        )
      }
    })
  }

  // ── Row delete ─────────────────────────────────────────────────────────────

  function handleDeleteRow(taskId: string) {
    if (!window.confirm("Delete this task? This action cannot be undone.")) return

    const snapshot = tasks
    setTasks((ts) => ts.filter((t) => t.id !== taskId))

    startTransition(async () => {
      const result = await deleteTask(taskId)
      if (result && "error" in result) {
        toast.error("Failed to delete task")
        setTasks(snapshot)
      } else {
        toast.success("Task deleted")
        router.refresh()
      }
    })
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  function handleBulkComplete() {
    const ids = Array.from(selected)
    const snapshot = tasks

    setTasks((ts) =>
      ts.map((t) => (ids.includes(t.id) ? { ...t, status: "COMPLETED" as TaskStatus } : t))
    )
    setSelected(new Set())

    startTransition(async () => {
      const results = await Promise.all(ids.map((id) => updateTaskStatus(id, "COMPLETED")))
      const anyFailed = results.some((r) => r && "error" in r)
      if (anyFailed) {
        toast.error("Some tasks could not be marked complete")
        setTasks(snapshot)
      } else {
        toast.success(`${ids.length} task${ids.length > 1 ? "s" : ""} marked complete`)
        router.refresh()
      }
    })
  }

  function handleBulkDelete() {
    const ids = Array.from(selected)
    if (!window.confirm(`Delete ${ids.length} task${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return

    const snapshot = tasks
    setTasks((ts) => ts.filter((t) => !ids.includes(t.id)))
    setSelected(new Set())

    startTransition(async () => {
      const results = await Promise.all(ids.map((id) => deleteTask(id)))
      const anyFailed = results.some((r) => r && "error" in r)
      if (anyFailed) {
        toast.error("Some tasks could not be deleted")
        setTasks(snapshot)
      } else {
        toast.success(`${ids.length} task${ids.length > 1 ? "s" : ""} deleted`)
        router.refresh()
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-border/50">
              {/* Checkbox */}
              <th className="px-3 py-2.5 text-left">
                <Checkbox
                  checked={allChecked}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement).dataset.indeterminate = someChecked ? "true" : "false"
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className={someChecked ? "opacity-60" : ""}
                />
              </th>

              {/* Priority */}
              <th
                className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("priority")}
              >
                Priority <SortIcon column="priority" sort={sort} />
              </th>

              {/* Title */}
              <th
                className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("title")}
              >
                Title <SortIcon column="title" sort={sort} />
              </th>

              {/* Status */}
              <th
                className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("status")}
              >
                Status <SortIcon column="status" sort={sort} />
              </th>

              {/* Assignees */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none">
                Assignees
              </th>

              {/* Due Date */}
              <th
                className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("dueDate")}
              >
                Due Date <SortIcon column="dueDate" sort={sort} />
              </th>

              {/* Category */}
              <th
                className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground"
                onClick={() => toggleSort("category")}
              >
                Category <SortIcon column="category" sort={sort} />
              </th>

              {/* Actions */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Ghost className="h-10 w-10 opacity-30" />
                    <span className="text-sm">No tasks match your filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isChecked = selected.has(task.id)
                const priorityConf = PRIORITY_CONFIG[task.priority]
                const dueDateChip = getDueDateChipClasses(task.dueDate, task.status)
                const assigneeEmails =
                  task.assigneeEmails && task.assigneeEmails.length > 0
                    ? task.assigneeEmails
                    : task.assignedTo
                    ? [task.assignedTo]
                    : []

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      isChecked && "bg-[#F7EDDB]/40"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 align-middle">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleRow(task.id)}
                        aria-label={`Select ${task.title}`}
                      />
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn("h-2 w-2 rounded-full flex-shrink-0", priorityConf.dot)}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {priorityConf.label}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-3 py-3 align-middle">
                      <span
                        className="max-w-[260px] truncate block cursor-pointer font-medium text-foreground hover:text-[#c57a3a] transition-colors"
                        title={task.title}
                        onClick={() => setSelectedTask(task)}
                      >
                        {task.title}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 align-middle">
                      <Select
                        value={task.status}
                        onValueChange={(val) => handleStatusChange(task.id, val as TaskStatus)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-auto w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-none focus:ring-0",
                            STATUS_BADGE_CLASSES[task.status]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Assignees */}
                    <td className="px-3 py-3 align-middle">
                      <Avatars emails={assigneeEmails} teamMembers={teamMembers} />
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      {task.dueDate ? (
                        <span className={cn(dueDateChip ?? "text-muted-foreground text-xs")}>
                          {formatDueDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 align-middle">
                      {task.category ? (
                        <span className="rounded-full bg-[#F7EDDB] px-2 py-0.5 text-xs text-[#c57a3a] border border-[#c57a3a]/20 whitespace-nowrap">
                          {task.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Task actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setSelectedTask(task)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => handleDeleteRow(task.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-[#c57a3a]/20 bg-[#F7EDDB] px-6 py-3 shadow-lg">
          <span className="text-sm font-medium text-[#c57a3a]">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              disabled={isPending}
              onClick={handleBulkComplete}
              className="bg-[#c57a3a] text-white hover:bg-[#b06930]"
            >
              Mark Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleBulkDelete}
              className="border-red-400 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Task detail drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          eventId={eventId}
          session={{ email: currentUserEmail }}
          assignees={assignees}
          onClose={() => {
            setSelectedTask(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
