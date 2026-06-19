"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  DoorOpen,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export type EventRow = {
  id: string
  title: string
  startsAt: Date | null
  capacity: number
  paidOrders: number
  ticketsIssued: number
  checkedInCount: number
  remainingCapacity: number
  revenueCents: number
  sellThroughRate: number
  checkInRate: number
}

type SortKey = "date" | "title" | "tickets" | "revenue" | "checkin" | "sellthrough"
type SortDir = "asc" | "desc"

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
  { label: "Sold Out", value: "soldout" },
  { label: "Active", value: "active" },
]

function isUpcoming(d: Date | null) {
  if (!d) return false
  return d.getTime() > Date.now()
}

function isToday(d: Date | null) {
  if (!d) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100)
}

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`
}

function fmtDate(d: Date | null) {
  if (!d) return "TBA"
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown size={13} className="text-muted-foreground/40" />
  return dir === "asc" ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums">{pct(value)}</span>
    </div>
  )
}

export function AdminEventsTable({ events }: { events: EventRow[] }) {
  const [view, setView] = useState<"table" | "grid">("table")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events
      .filter((e) => {
        if (q && !e.title.toLowerCase().includes(q)) return false
        if (status === "upcoming" && !isUpcoming(e.startsAt)) return false
        if (status === "past" && isUpcoming(e.startsAt)) return false
        if (status === "soldout" && e.remainingCapacity > 0) return false
        if (status === "active" && e.ticketsIssued === 0) return false
        return true
      })
      .sort((a, b) => {
        let v = 0
        if (sortKey === "date") v = (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)
        else if (sortKey === "title") v = a.title.localeCompare(b.title)
        else if (sortKey === "tickets") v = a.ticketsIssued - b.ticketsIssued
        else if (sortKey === "revenue") v = a.revenueCents - b.revenueCents
        else if (sortKey === "checkin") v = a.checkInRate - b.checkInRate
        else if (sortKey === "sellthrough") v = a.sellThroughRate - b.sellThroughRate
        return sortDir === "asc" ? v : -v
      })
  }, [events, search, status, sortKey, sortDir])

  const hasFilters = search !== "" || status !== "all"

  return (
    <div className="space-y-3">
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setStatus("all") }}
            className="h-10 gap-1.5 rounded-xl text-muted-foreground"
          >
            <X size={14} /> Clear
          </Button>
        )}
        {/* View toggle */}
        <div className="flex rounded-xl border border-border bg-background shadow-sm">
          <button
            onClick={() => setView("table")}
            className={cn("flex h-10 w-10 items-center justify-center rounded-l-xl transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            aria-label="Table view"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn("flex h-10 w-10 items-center justify-center rounded-r-xl transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* ── Status chips ────────────────────────────────────────────── */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto shrink-0 self-center pr-1 text-xs text-muted-foreground">
          {filtered.length} of {events.length}
        </span>
      </div>

      {/* ── Table view ──────────────────────────────────────────────── */}
      {view === "table" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {(
                    [
                      { key: "title" as SortKey, label: "Event", w: "min-w-[200px]" },
                      { key: "date" as SortKey, label: "Date", w: "w-[110px]" },
                      { key: "tickets" as SortKey, label: "Tickets", w: "w-[90px]" },
                      { key: "revenue" as SortKey, label: "Revenue", w: "w-[110px]" },
                      { key: "sellthrough" as SortKey, label: "Sell-thru", w: "w-[120px]" },
                      { key: "checkin" as SortKey, label: "Check-in", w: "w-[120px]" },
                    ] as { key: SortKey; label: string; w: string }[]
                  ).map(({ key, label, w }) => (
                    <th
                      key={key}
                      className={cn("px-4 py-3 text-left font-semibold text-muted-foreground", w)}
                    >
                      <button
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                      >
                        {label}
                        <SortIcon col={key} active={sortKey} dir={sortDir} />
                      </button>
                    </th>
                  ))}
                  <th className="w-[130px] px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No events match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{event.title}</span>
                              {isToday(event.startsAt) && (
                                <span className="inline-flex h-4 items-center rounded-full bg-green-100 px-1.5 text-[9px] font-bold uppercase tracking-wide text-green-700">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {event.remainingCapacity > 0
                                ? `${event.remainingCapacity} of ${event.capacity} spots left`
                                : <span className="text-destructive font-medium">Sold out</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarDays size={13} />
                          <span className="text-xs">{fmtDate(event.startsAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="tabular-nums font-medium">{event.ticketsIssued}</span>
                        <span className="ml-1 text-xs text-muted-foreground">/ {event.capacity}</span>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{fmt(event.revenueCents)}</td>
                      <td className="px-4 py-3">
                        <RateBar value={event.sellThroughRate} color="bg-violet-500" />
                      </td>
                      <td className="px-4 py-3">
                        <RateBar value={event.checkInRate} color="bg-emerald-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/admin/planning/${event.id}/dashboard`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
                            title="Planning"
                          >
                            <ClipboardList size={13} />
                          </Link>
                          <Link
                            href="/admin/check-in"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
                            title="Check-In"
                          >
                            <DoorOpen size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grid view ───────────────────────────────────────────────── */}
      {view === "grid" && (
        <>
          {filtered.length === 0 ? (
            <Card className="border border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No events match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <Card key={event.id} className="border border-border shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-1.5 text-center">
                        <span className="text-[9px] font-bold uppercase text-primary">
                          {event.startsAt ? event.startsAt.toLocaleDateString("en-CA", { month: "short" }) : "TBA"}
                        </span>
                        <span className="font-serif text-lg font-bold leading-none text-primary">
                          {event.startsAt ? event.startsAt.getDate() : "—"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="truncate font-serif text-sm font-bold">{event.title}</span>
                          {isToday(event.startsAt) && (
                            <Badge className="h-4 px-1.5 text-[9px]">Today</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                          <div className="rounded-lg bg-muted/50 px-1.5 py-1 text-center">
                            <div className="font-semibold text-foreground">{event.ticketsIssued}</div>
                            <div>tickets</div>
                          </div>
                          <div className="rounded-lg bg-muted/50 px-1.5 py-1 text-center">
                            <div className="font-semibold text-foreground">{fmt(event.revenueCents)}</div>
                            <div>revenue</div>
                          </div>
                          <div className="rounded-lg bg-muted/50 px-1.5 py-1 text-center">
                            <div className="font-semibold text-foreground">{pct(event.checkInRate)}</div>
                            <div>door</div>
                          </div>
                        </div>
                        <div className="mt-2.5 flex gap-2">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="flex-1 rounded-xl bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground"
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/admin/planning/${event.id}/dashboard`}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background"
                            title="Planning"
                          >
                            <ClipboardList size={13} />
                          </Link>
                          <Link
                            href="/admin/check-in"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background"
                            title="Check-In"
                          >
                            <DoorOpen size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
