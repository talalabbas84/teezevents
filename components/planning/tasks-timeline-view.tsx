"use client"

import { useState, useMemo } from "react"
import type { PlanningTaskSerialized, TaskPriority } from "@/lib/planning/types"
import { cn } from "@/lib/utils"
import { TaskDetailDrawer } from "@/components/planning/task-detail-drawer"
import type { TeamMemberOption } from "@/components/planning/assignee-select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TasksTimelineViewProps {
  tasks: PlanningTaskSerialized[]
  eventId: string
  currentUserEmail: string
  assignees: TeamMemberOption[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH = 36 // px per day column
const ROW_HEIGHT = 40 // px per task row
const BAR_HEIGHT = 28 // px height of task bar

const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-300",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
}

const PRIORITY_BAR_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-300",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-400",
  URGENT: "bg-red-400",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000)
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksTimelineView({
  tasks,
  eventId,
  currentUserEmail,
  assignees,
}: TasksTimelineViewProps) {
  const [selectedTask, setSelectedTask] = useState<PlanningTaskSerialized | null>(null)

  const today = useMemo(() => startOfDay(new Date()), [])

  // Split tasks into dated and undated
  const { datedTasks, undatedTasks } = useMemo(() => {
    const dated: PlanningTaskSerialized[] = []
    const undated: PlanningTaskSerialized[] = []
    for (const t of tasks) {
      if (t.dueDate) dated.push(t)
      else undated.push(t)
    }
    return { datedTasks: dated, undatedTasks: undated }
  }, [tasks])

  // Calculate date range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (datedTasks.length === 0) {
      return { rangeStart: null, rangeEnd: null, totalDays: 0 }
    }
    const dates = datedTasks.map((t) => startOfDay(new Date(t.dueDate!)))
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
    const start = addDays(minDate, -7)
    const end = addDays(maxDate, 7)
    const days = diffDays(end, start) + 1
    return { rangeStart: start, rangeEnd: end, totalDays: days }
  }, [datedTasks])

  // Generate array of days in range
  const days = useMemo(() => {
    if (!rangeStart || totalDays === 0) return []
    return Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i))
  }, [rangeStart, totalDays])

  // Today marker offset
  const todayOffset = useMemo(() => {
    if (!rangeStart) return null
    const diff = diffDays(today, rangeStart)
    if (diff < 0 || diff >= totalDays) return null
    return diff * DAY_WIDTH
  }, [today, rangeStart, totalDays])

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">No tasks to show</p>
      </div>
    )
  }

  // No dated tasks
  if (datedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm">No dated tasks to display on timeline</p>
        {undatedTasks.length > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            {undatedTasks.length} task{undatedTasks.length !== 1 ? "s" : ""} have no due date
          </p>
        )}
      </div>
    )
  }

  const totalWidth = totalDays * DAY_WIDTH

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <div className="flex" style={{ minWidth: "fit-content" }}>
          {/* ── Left sticky column ── */}
          <div className="sticky left-0 z-20 w-60 shrink-0 border-r border-border bg-white">
            {/* Header cell */}
            <div
              className="flex items-center border-b border-border bg-white px-3"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Task
              </span>
            </div>

            {/* Dated task rows */}
            {datedTasks.map((task) => (
              <div
                key={task.id}
                className="flex cursor-pointer items-center gap-2 border-b border-border/40 px-3 transition-colors hover:bg-amber-50/60"
                style={{ height: ROW_HEIGHT }}
                onClick={() => setSelectedTask(task)}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    PRIORITY_DOT_COLORS[task.priority]
                  )}
                />
                <span className="truncate text-sm text-foreground">{task.title}</span>
              </div>
            ))}

            {/* Undated section header */}
            {undatedTasks.length > 0 && (
              <>
                <div
                  className="flex items-center border-b border-border bg-slate-50 px-3"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    Undated Tasks ({undatedTasks.length})
                  </span>
                </div>
                {undatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex cursor-pointer items-center gap-2 border-b border-border/40 px-3 transition-colors hover:bg-amber-50/60"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => setSelectedTask(task)}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        PRIORITY_DOT_COLORS[task.priority]
                      )}
                    />
                    <span className="truncate text-sm text-foreground">{task.title}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Right scrollable area ── */}
          <div className="relative flex-1" style={{ width: totalWidth }}>
            {/* Date ruler row */}
            <div
              className="relative flex border-b border-border bg-slate-50"
              style={{ height: ROW_HEIGHT, width: totalWidth }}
            >
              {days.map((day, i) => {
                const isNewMonth = i === 0 || day.getMonth() !== days[i - 1].getMonth()
                const showLabel =
                  totalDays <= 30 ? true : i === 0 || i % 7 === 0 || isNewMonth
                const isToday = diffDays(day, today) === 0

                return (
                  <div
                    key={i}
                    className={cn(
                      "relative flex shrink-0 items-end justify-center pb-1",
                      isToday && "bg-red-50"
                    )}
                    style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  >
                    {showLabel && (
                      <span
                        className={cn(
                          "pointer-events-none select-none whitespace-nowrap text-[10px] leading-none",
                          isToday ? "font-bold text-red-500" : "text-muted-foreground",
                          isNewMonth && !isToday && "font-semibold text-slate-600"
                        )}
                      >
                        {isNewMonth ? formatMonthYear(day) : formatMonthDay(day)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Today marker (vertical line spanning task rows) */}
            {todayOffset !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10"
                style={{
                  left: todayOffset + DAY_WIDTH / 2,
                  top: ROW_HEIGHT,
                  bottom: 0,
                  width: 1,
                }}
              >
                <div className="h-full w-px bg-red-400 opacity-60" />
              </div>
            )}

            {/* Dated task bar rows */}
            {datedTasks.map((task) => {
              const dueDateObj = task.dueDate ? startOfDay(new Date(task.dueDate)) : null
              const colIndex = dueDateObj ? diffDays(dueDateObj, rangeStart!) : null
              const isOverdue =
                task.status !== "COMPLETED" && dueDateObj !== null && dueDateObj < today
              const isCompleted = task.status === "COMPLETED"

              const barLeft =
                colIndex !== null ? colIndex * DAY_WIDTH + (DAY_WIDTH - BAR_HEIGHT) / 2 : null

              return (
                <div
                  key={task.id}
                  className="relative border-b border-border/40"
                  style={{ height: ROW_HEIGHT, width: totalWidth }}
                >
                  {/* Today column highlight behind bars */}
                  {todayOffset !== null && (
                    <div
                      className="pointer-events-none absolute inset-y-0 bg-red-50/50"
                      style={{ left: todayOffset, width: DAY_WIDTH }}
                    />
                  )}

                  {/* Task bar marker */}
                  {barLeft !== null && (
                    <div
                      className="absolute cursor-pointer"
                      style={{
                        left: barLeft,
                        top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                        width: BAR_HEIGHT,
                        height: BAR_HEIGHT,
                      }}
                      title={`${task.title} — Due: ${dueDateObj ? formatMonthDay(dueDateObj) : "No date"}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div
                        className={cn(
                          "h-full w-full rounded-full transition-opacity hover:opacity-80",
                          isCompleted
                            ? "bg-green-500 opacity-70"
                            : isOverdue
                              ? "bg-red-500"
                              : PRIORITY_BAR_COLORS[task.priority]
                        )}
                        style={
                          isOverdue
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.15) 4px, rgba(0,0,0,0.15) 8px)",
                              }
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Undated section header row */}
            {undatedTasks.length > 0 && (
              <div
                className="border-b border-border bg-slate-50"
                style={{ height: ROW_HEIGHT, width: totalWidth }}
              />
            )}

            {/* Undated task rows */}
            {undatedTasks.map((task) => (
              <div
                key={task.id}
                className="relative flex items-center border-b border-border/40"
                style={{ height: ROW_HEIGHT, width: totalWidth }}
              >
                {/* Gray placeholder bar spanning most of the width */}
                <div
                  className="mx-4 flex h-7 flex-1 items-center rounded-full bg-slate-100 px-3"
                >
                  <span className="text-xs text-slate-400">No due date</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task detail drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        eventId={eventId}
        session={{ email: currentUserEmail }}
        assignees={assignees}
        onClose={() => setSelectedTask(null)}
      />
    </>
  )
}
