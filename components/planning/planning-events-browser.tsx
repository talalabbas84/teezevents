"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowRight,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PlanningEventBrowserItem = {
  id: string
  title: string
  startsAt: string | null
  category: string | null
  image: string | null
  isActive: boolean
  planningStatus: string
  _count: {
    planningTasks: number
    eventVendors: number
    checklists: number
  }
}

const PLANNING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PLANNING: "Planning",
  READY: "Ready",
  LIVE: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
}

const PLANNING_STATUSES = [
  "DRAFT",
  "PLANNING",
  "READY",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]

function formatEventDate(startsAt: string | null) {
  if (!startsAt) return "TBA"
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return "TBA"
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function eventTime(startsAt: string | null) {
  if (!startsAt) return Number.POSITIVE_INFINITY
  const time = new Date(startsAt).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function isUpcoming(startsAt: string | null) {
  if (!startsAt) return true
  return eventTime(startsAt) >= Date.now()
}

function isThisMonth(startsAt: string | null) {
  if (!startsAt) return false
  const date = new Date(startsAt)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function getPlanningStatusStyles(status: string): string {
  switch (status) {
    case "DRAFT": return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
    case "PLANNING": return "border-blue-400/40 bg-blue-500/10 text-blue-700"
    case "READY": return "border-amber-400/40 bg-amber-500/10 text-amber-700"
    case "LIVE": return "border-green-500/40 bg-green-500/10 text-green-700"
    case "COMPLETED": return "border-indigo-400/40 bg-indigo-500/10 text-indigo-700"
    case "CANCELLED": return "border-red-400/40 bg-red-500/10 text-red-700"
    case "ARCHIVED": return "border-muted-foreground/20 bg-muted/30 text-muted-foreground/70"
    default: return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
  }
}

function progressForStatus(status: string, total: number) {
  if (total <= 0) return 0
  const progressMap: Record<string, number> = {
    DRAFT: 5,
    PLANNING: 25,
    READY: 60,
    LIVE: 80,
    COMPLETED: 100,
    CANCELLED: 0,
    ARCHIVED: 100,
  }
  return progressMap[status] ?? 0
}

function EventCard({ event }: { event: PlanningEventBrowserItem }) {
  const upcoming = isUpcoming(event.startsAt)
  const total = event._count.planningTasks + event._count.eventVendors + event._count.checklists
  const pct = progressForStatus(event.planningStatus, total)

  return (
    <Card className="overflow-hidden border border-border shadow-lg transition-shadow hover:shadow-xl">
      <div className="relative aspect-[16/9] w-full bg-muted">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CalendarDays size={36} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant={upcoming ? "default" : "secondary"}>
            {upcoming ? "UPCOMING" : "PAST"}
          </Badge>
          {!event.isActive ? (
            <Badge variant="outline" className="border-stone-300 bg-white/90 text-stone-600">
              Hidden
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {event.category && (
            <Badge variant="outline" className="text-xs">
              {event.category}
            </Badge>
          )}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              getPlanningStatusStyles(event.planningStatus)
            )}
          >
            {PLANNING_STATUS_LABELS[event.planningStatus] ?? event.planningStatus}
          </span>
        </div>

        <div>
          <h2 className="line-clamp-2 font-serif text-xl font-bold leading-snug">
            {event.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays size={13} />
            {formatEventDate(event.startsAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
          <div className="rounded-xl bg-muted/50 px-2 py-2">
            <div className="font-semibold text-foreground">{event._count.planningTasks}</div>
            <div>Tasks</div>
          </div>
          <div className="rounded-xl bg-muted/50 px-2 py-2">
            <div className="font-semibold text-foreground">{event._count.eventVendors}</div>
            <div>Vendors</div>
          </div>
          <div className="rounded-xl bg-muted/50 px-2 py-2">
            <div className="font-semibold text-foreground">{event._count.checklists}</div>
            <div>Lists</div>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-1.5 rounded-full transition-all",
              event.planningStatus === "CANCELLED" ? "bg-red-400" :
              event.planningStatus === "LIVE" ? "bg-green-500" :
              event.planningStatus === "COMPLETED" || event.planningStatus === "ARCHIVED" ? "bg-indigo-500" :
              "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" size="sm" className="h-10 px-2">
            <Link href={`/admin/planning/${event.id}/dashboard`} aria-label={`Open ${event.title} dashboard`}>
              <LayoutDashboard className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 px-2">
            <Link href={`/admin/planning/${event.id}/tasks`} aria-label={`Open ${event.title} tasks`}>
              <ListChecks className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Tasks</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 px-2">
            <Link href={`/admin/planning/${event.id}/distribution`} aria-label={`Open ${event.title} distribution`}>
              <Megaphone className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Publish</span>
            </Link>
          </Button>
        </div>

        <Button asChild className="mt-auto h-11 w-full bg-primary text-primary-foreground hover:bg-accent">
          <Link href={`/admin/planning/${event.id}/dashboard`}>
            <span className="inline-flex items-center gap-2">
              Open Planning
              <ArrowRight size={15} />
            </span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function PlanningEventsBrowser({ events }: { events: PlanningEventBrowserItem[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [visibilityFilter, setVisibilityFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("DATE_DESC")

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter(Boolean))).sort() as string[],
    [events]
  )

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const categoryFilter = dateFilter.startsWith("CATEGORY:")
      ? dateFilter.replace("CATEGORY:", "")
      : null

    return events
      .filter((event) => {
        if (q) {
          const haystack = `${event.title} ${event.category ?? ""} ${event.planningStatus}`.toLowerCase()
          if (!haystack.includes(q)) return false
        }

        if (dateFilter === "UPCOMING" && !isUpcoming(event.startsAt)) return false
        if (dateFilter === "PAST" && isUpcoming(event.startsAt)) return false
        if (dateFilter === "THIS_MONTH" && !isThisMonth(event.startsAt)) return false
        if (dateFilter === "NEEDS_ACTION" && !["DRAFT", "PLANNING", "READY"].includes(event.planningStatus)) return false
        if (categoryFilter && event.category !== categoryFilter) return false

        if (statusFilter !== "ALL" && event.planningStatus !== statusFilter) return false
        if (visibilityFilter === "PUBLIC" && !event.isActive) return false
        if (visibilityFilter === "HIDDEN" && event.isActive) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === "DATE_ASC") return eventTime(a.startsAt) - eventTime(b.startsAt)
        if (sortBy === "TITLE") return a.title.localeCompare(b.title)
        if (sortBy === "TASKS") return b._count.planningTasks - a._count.planningTasks
        return eventTime(b.startsAt) - eventTime(a.startsAt)
      })
  }, [events, searchQuery, dateFilter, statusFilter, visibilityFilter, sortBy])

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    dateFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    visibilityFilter !== "ALL" ||
    sortBy !== "DATE_DESC"

  function clearFilters() {
    setSearchQuery("")
    setDateFilter("ALL")
    setStatusFilter("ALL")
    setVisibilityFilter("ALL")
    setSortBy("DATE_DESC")
  }

  const quickFilters = [
    { label: "All", value: "ALL" },
    { label: "Upcoming", value: "UPCOMING" },
    { label: "This month", value: "THIS_MONTH" },
    { label: "Needs action", value: "NEEDS_ACTION" },
    { label: "Past", value: "PAST" },
    ...categories.slice(0, 4).map((category) => ({ label: category, value: `CATEGORY:${category}` })),
  ]

  return (
    <div className="space-y-5">
      <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 -mx-4 border-y border-border/70 bg-[#F7EDDB]/95 px-4 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-white/85">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events"
              className="h-11 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-base shadow-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-[130px] rounded-xl bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              {PLANNING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {PLANNING_STATUS_LABELS[status] ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-11 w-11 rounded-xl bg-white px-0 sm:w-[145px] sm:px-3" aria-label="Sort events">
              <SlidersHorizontal className="mx-auto h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DATE_DESC">Newest first</SelectItem>
              <SelectItem value="DATE_ASC">Soonest first</SelectItem>
              <SelectItem value="TITLE">Title A-Z</SelectItem>
              <SelectItem value="TASKS">Most tasks</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white" onClick={clearFilters}>
              <X className="h-4 w-4" />
              <span className="sr-only">Clear filters</span>
            </Button>
          ) : null}
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {quickFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setDateFilter(filter.value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition",
                dateFilter === filter.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-muted-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setVisibilityFilter(visibilityFilter === "HIDDEN" ? "ALL" : "HIDDEN")}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition",
              visibilityFilter === "HIDDEN"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-muted-foreground"
            )}
          >
            Hidden
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredEvents.length} of {events.length} events</span>
          {hasActiveFilters ? (
            <button type="button" onClick={clearFilters} className="font-medium text-primary">
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="border border-dashed border-border bg-white/80">
          <CardContent className="px-6 py-12 text-center">
            <CalendarDays className="mx-auto mb-4 text-muted-foreground" size={36} />
            <h2 className="font-serif text-2xl font-bold">No events match</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Adjust the search or filters to find a planning workspace.
            </p>
            <Button type="button" variant="outline" className="mt-5" onClick={clearFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
