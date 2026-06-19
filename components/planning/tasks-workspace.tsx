"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import type { TeamMemberOption } from "@/components/planning/assignee-select"
import { createTask, updateTaskStatus, deleteTask } from "@/actions/planning"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { TasksBoardClient } from "@/components/planning/tasks-board"
import { TasksListView } from "@/components/planning/tasks-list-view"
import { TasksTimelineView } from "@/components/planning/tasks-timeline-view"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import {
  LayoutGrid,
  List,
  GanttChartSquare,
  Search,
  X,
  Users,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  Flag,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewType = "board" | "list" | "timeline"

export type TasksWorkspaceProps = {
  tasks: PlanningTaskSerialized[]
  eventId: string
  currentUserEmail: string
  teamMembers: Array<{ email: string; name: string | null; avatarColor: string | null }>
}

type DueDateFilter = "ALL" | "TODAY" | "THIS_WEEK" | "OVERDUE" | "NO_DATE"

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; dot: string }[] = [
  { value: "URGENT", label: "Urgent", dot: "bg-red-500" },
  { value: "HIGH", label: "High", dot: "bg-orange-500" },
  { value: "MEDIUM", label: "Medium", dot: "bg-blue-400" },
  { value: "LOW", label: "Low", dot: "bg-slate-300" },
]

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: "ALL", label: "All dates" },
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "NO_DATE", label: "No date" },
]

const VIEW_OPTIONS: { value: ViewType; label: string; icon: React.ReactNode }[] = [
  { value: "board", label: "Board", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: "list", label: "List", icon: <List className="h-3.5 w-3.5" /> },
  { value: "timeline", label: "Timeline", icon: <GanttChartSquare className="h-3.5 w-3.5" /> },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEmailHue(email: string) {
  return Array.from(email).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
}

function getAvatarColor(
  email: string,
  teamMembers: Array<{ email: string; avatarColor: string | null }>
) {
  const member = teamMembers.find((m) => m.email === email)
  if (member?.avatarColor) return member.avatarColor
  return `hsl(${getEmailHue(email)}, 55%, 42%)`
}

function getMemberName(
  email: string,
  teamMembers: Array<{ email: string; name: string | null }>
) {
  return teamMembers.find((m) => m.email === email)?.name ?? email
}

// ─── Assignee Filter Dropdown ─────────────────────────────────────────────────

function AssigneeFilterDropdown({
  teamMembers,
  selected,
  onChange,
  currentUserEmail,
}: {
  teamMembers: Array<{ email: string; name: string | null; avatarColor: string | null }>
  selected: string[]
  onChange: (val: string[]) => void
  currentUserEmail: string
}) {
  const isMyTasks = selected.length === 1 && selected[0] === "ME"
  const isUnassigned = selected.length === 1 && selected[0] === "UNASSIGNED"
  const isAll = selected.length === 0

  const label = isMyTasks
    ? "My Tasks"
    : isUnassigned
    ? "Unassigned"
    : selected.length === 1
    ? getMemberName(selected[0], teamMembers)
    : selected.length > 1
    ? `${selected.length} assignees`
    : "Assignee"

  function toggleMember(email: string) {
    const current = selected.filter((s) => s !== "ME" && s !== "UNASSIGNED")
    if (current.includes(email)) {
      onChange(current.filter((s) => s !== email))
    } else {
      onChange([...current, email])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
            !isAll
              ? "border-[#c57a3a]/40 bg-[#c57a3a]/10 text-[#c57a3a]"
              : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuCheckboxItem
          checked={isMyTasks}
          onCheckedChange={(checked) => onChange(checked ? ["ME"] : [])}
        >
          <span className="flex items-center gap-2">
            <span className="text-base">👤</span> My Tasks
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={isUnassigned}
          onCheckedChange={(checked) => onChange(checked ? ["UNASSIGNED"] : [])}
        >
          <span className="flex items-center gap-2">
            <span className="text-base">🚫</span> Unassigned
          </span>
        </DropdownMenuCheckboxItem>
        {teamMembers.length > 0 && <DropdownMenuSeparator />}
        {teamMembers.map((member) => {
          const checked =
            !isMyTasks && !isUnassigned && selected.includes(member.email)
          return (
            <DropdownMenuCheckboxItem
              key={member.email}
              checked={checked}
              onCheckedChange={() => toggleMember(member.email)}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(member.email, teamMembers) }}
                >
                  {(member.name ?? member.email).charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{member.name ?? member.email}</span>
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
        {!isAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              Clear filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Priority Filter Dropdown ─────────────────────────────────────────────────

function PriorityFilterDropdown({
  value,
  onChange,
}: {
  value: TaskPriority | "ALL"
  onChange: (v: TaskPriority | "ALL") => void
}) {
  const selected = PRIORITY_OPTIONS.find((p) => p.value === value)
  const label = selected ? selected.label : "Priority"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
            value !== "ALL"
              ? "border-[#c57a3a]/40 bg-[#c57a3a]/10 text-[#c57a3a]"
              : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
          )}
        >
          <Flag className="h-3.5 w-3.5" />
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onSelect={() => onChange("ALL")}
          className={cn(value === "ALL" && "text-[#c57a3a] font-medium")}
        >
          All priorities
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {PRIORITY_OPTIONS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onSelect={() => onChange(p.value)}
            className={cn(value === p.value && "text-[#c57a3a] font-medium")}
          >
            <span className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", p.dot)} />
              {p.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksWorkspace({
  tasks: initialTasks,
  eventId,
  currentUserEmail,
  teamMembers,
}: TasksWorkspaceProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // View selection
  const [view, setView] = useState<ViewType>("board")

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  // Build TeamMemberOption[] for the board child (which needs role etc.)
  const assignees = useMemo((): TeamMemberOption[] => {
    const base = teamMembers.map((m) => ({
      id: m.email,
      email: m.email,
      name: m.name,
      role: "MEMBER",
      avatarColor: m.avatarColor,
    }))
    if (!base.some((m) => m.email === currentUserEmail)) {
      base.unshift({
        id: "current-user",
        email: currentUserEmail,
        name: "Me",
        role: "ADMIN",
        avatarColor: "#c57a3a",
      })
    }
    return base
  }, [teamMembers, currentUserEmail])

  // Unique categories from tasks
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    initialTasks.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [initialTasks])

  // Derived: filtered tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const now = Date.now()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000

    return initialTasks.filter((t) => {
      const taskAssignees =
        t.assigneeEmails.length > 0
          ? t.assigneeEmails
          : t.assignedTo
          ? [t.assignedTo]
          : []
      const dueDate = t.dueDate ? new Date(t.dueDate) : null
      const hasValidDueDate = dueDate !== null && !Number.isNaN(dueDate.getTime())
      const dueTime = hasValidDueDate ? dueDate!.getTime() : null

      // Priority filter (single-select)
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false

      // Category filter
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false

      // Assignee filter
      if (assigneeFilter.length > 0) {
        const isMe = assigneeFilter[0] === "ME"
        const isUnassigned = assigneeFilter[0] === "UNASSIGNED"
        if (isMe) {
          if (!taskAssignees.includes(currentUserEmail)) return false
        } else if (isUnassigned) {
          if (taskAssignees.length > 0) return false
        } else {
          if (!assigneeFilter.some((email) => taskAssignees.includes(email))) return false
        }
      }

      // Due date filter
      if (dueDateFilter === "OVERDUE") {
        if (dueTime === null || dueTime >= now || t.status === "COMPLETED") return false
      }
      if (dueDateFilter === "TODAY") {
        if (dueTime === null || dueTime < todayStart.getTime() || dueTime > todayEnd.getTime())
          return false
      }
      if (dueDateFilter === "THIS_WEEK") {
        if (dueTime === null || dueTime < now || dueTime > weekFromNow) return false
      }
      if (dueDateFilter === "NO_DATE") {
        if (hasValidDueDate) return false
      }

      // Search
      if (q) {
        const haystack = `${t.title} ${t.description ?? ""} ${t.category ?? ""} ${taskAssignees.join(" ")}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [
    initialTasks,
    searchQuery,
    priorityFilter,
    categoryFilter,
    assigneeFilter,
    dueDateFilter,
    currentUserEmail,
  ])

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    priorityFilter !== "ALL" ||
    assigneeFilter.length > 0 ||
    dueDateFilter !== "ALL" ||
    categoryFilter !== "ALL"

  function clearAllFilters() {
    setSearchQuery("")
    setPriorityFilter("ALL")
    setAssigneeFilter([])
    setDueDateFilter("ALL")
    setCategoryFilter("ALL")
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Single combined toolbar ── */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-wrap items-center gap-2 border-y border-border bg-white/95 px-4 py-2 shadow-sm backdrop-blur-xl lg:static lg:mx-0 lg:rounded-xl lg:border">
        {/* View toggle pill */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 shrink-0">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                view === v.value
                  ? "bg-[#c57a3a] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* Task count badge */}
        <span className="rounded-full bg-[#c57a3a]/10 px-2 py-0.5 text-xs font-medium text-[#c57a3a] shrink-0">
          {hasActiveFilters && filteredTasks.length !== initialTasks.length
            ? `${filteredTasks.length} / ${initialTasks.length}`
            : `${initialTasks.length} tasks`}
        </span>

        {/* Search */}
        <div className="relative min-w-[180px] flex-1 sm:max-w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-7 text-xs placeholder:text-muted-foreground/70 transition-all focus:border-[#c57a3a]/50 focus:outline-none focus:ring-2 focus:ring-[#c57a3a]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Assignee dropdown */}
        <AssigneeFilterDropdown
          teamMembers={teamMembers}
          selected={assigneeFilter}
          onChange={setAssigneeFilter}
          currentUserEmail={currentUserEmail}
        />

        {/* Priority dropdown */}
        <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />

        {/* Due date filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                dueDateFilter !== "ALL"
                  ? "border-[#c57a3a]/40 bg-[#c57a3a]/10 text-[#c57a3a]"
                  : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {DUE_DATE_OPTIONS.find((o) => o.value === dueDateFilter)?.label ?? "Due Date"}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DUE_DATE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => setDueDateFilter(opt.value)}
                className={cn(dueDateFilter === opt.value && "text-[#c57a3a] font-medium")}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter */}
        {uniqueCategories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                  categoryFilter !== "ALL"
                    ? "border-[#c57a3a]/40 bg-[#c57a3a]/10 text-[#c57a3a]"
                    : "border-border bg-muted/30 text-foreground hover:bg-muted/50"
                )}
              >
                {categoryFilter === "ALL" ? "Category" : categoryFilter}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => setCategoryFilter("ALL")}
                className={cn(categoryFilter === "ALL" && "text-[#c57a3a] font-medium")}
              >
                All Categories
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueCategories.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onSelect={() => setCategoryFilter(cat)}
                  className={cn(categoryFilter === cat && "text-[#c57a3a] font-medium")}
                >
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer pushes + Task and Clear to the right */}
        <div className="flex-1" />

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex h-8 items-center gap-1 rounded-lg border border-border/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground shrink-0"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* ── View content ── */}
      {view === "board" && (
        <TasksBoardClient
          eventId={eventId}
          initialTasks={filteredTasks}
          adminEmail={currentUserEmail}
          assignees={assignees}
        />
      )}

      {view === "list" && (
        <TasksListView
          tasks={filteredTasks}
          eventId={eventId}
          currentUserEmail={currentUserEmail}
          teamMembers={teamMembers}
          assignees={assignees}
        />
      )}

      {view === "timeline" && (
        <TasksTimelineView
          tasks={filteredTasks}
          eventId={eventId}
          currentUserEmail={currentUserEmail}
          assignees={assignees}
        />
      )}
    </div>
  )
}
