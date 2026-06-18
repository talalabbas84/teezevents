"use client"

import { cn } from "@/lib/utils"
import type {
  PlanningTaskSerialized,
  BudgetItemSerialized,
  EventVendorSerialized,
  RiskSerialized,
  ChecklistSerialized,
  TaskStatus,
  VendorStatus,
  RiskSeverity,
  RiskStatus,
} from "@/lib/planning/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

import {
  Printer,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Building2,
  AlertTriangle,
  DollarSign,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventInfo = {
  title: string
  capacity: number
  ticketPriceCents: number
  startsAt: string | null
  venue: string | null
}

type OrderStats = {
  paidOrdersCount: number
  totalRevenueCents: number
}

export type ReportData = {
  tasks: PlanningTaskSerialized[]
  budget: BudgetItemSerialized[]
  vendors: EventVendorSerialized[]
  risks: RiskSerialized[]
  checklists: ChecklistSerialized[]
  event: EventInfo | null
  orderStats: OrderStats
}

interface ReportsClientProps {
  eventId: string
  data: ReportData
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCAD(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const TASK_STATUS_ORDER: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
]

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "bg-stone-300",
  IN_PROGRESS: "bg-blue-400",
  BLOCKED: "bg-red-400",
  NEEDS_REVIEW: "bg-amber-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-stone-200",
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  NEEDS_REVIEW: "Needs Review",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const VENDOR_STATUS_ORDER: VendorStatus[] = [
  "CONFIRMED",
  "CONTACTED",
  "PENDING",
  "CANCELLED",
  "REJECTED",
]

const VENDOR_STATUS_BADGE: Record<VendorStatus, string> = {
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONTACTED: "border-blue-200 bg-blue-50 text-blue-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  CANCELLED: "border-stone-200 bg-stone-50 text-stone-500",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
}

const RISK_SEVERITY_BADGE: Record<RiskSeverity, string> = {
  CRITICAL: "border-red-300 bg-red-100 text-red-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-stone-200 bg-stone-50 text-stone-600",
}

const RISK_STATUS_BADGE: Record<RiskStatus, string> = {
  OPEN: "border-red-200 bg-red-50 text-red-700",
  MITIGATED: "border-amber-200 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACCEPTED: "border-blue-200 bg-blue-50 text-blue-700",
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: "green" | "red" | "neutral"
}) {
  return (
    <Card className="border-stone-200 bg-white/70">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-500 uppercase tracking-wide">{label}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold truncate",
                accent === "green"
                  ? "text-emerald-600"
                  : accent === "red"
                  ? "text-red-600"
                  : "text-stone-900"
              )}
            >
              {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
          </div>
          <div className="shrink-0 text-[#c57a3a]">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ReportsClient({ eventId, data }: ReportsClientProps) {
  const { tasks, budget, vendors, risks, checklists, event, orderStats } = data

  // ── Task stats ──
  const taskTotal = tasks.length
  const taskByStatus = Object.fromEntries(
    TASK_STATUS_ORDER.map((s) => [
      s,
      tasks.filter((t) => t.status === s).length,
    ])
  ) as Record<TaskStatus, number>
  const taskCompleted = taskByStatus["COMPLETED"] ?? 0
  const taskCompletePct = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0

  // ── Budget stats ──
  const budgetEstimatedTotal = budget.reduce((s, i) => s + i.estimatedCents, 0)
  const budgetActualTotal = budget.reduce((s, i) => s + i.actualCents, 0)
  const budgetVariance = budgetActualTotal - budgetEstimatedTotal

  // ── Vendor stats ──
  const vendorTotal = vendors.length
  const vendorConfirmed = vendors.filter((v) => v.status === "CONFIRMED").length

  // ── Risk stats ──
  const riskOpen = risks.filter((r) => r.status === "OPEN").length
  const riskResolved = risks.filter((r) => r.status === "RESOLVED").length

  // ── Checklist items across all checklists ──
  function getChecklistItems(cl: ChecklistSerialized) {
    const sectionItems = cl.sections.flatMap((s) => s.items)
    return [...cl.items, ...sectionItems]
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Event Report
          </h1>
          {event && (
            <div className="mt-1 space-y-0.5">
              <p className="text-stone-700 font-medium">{event.title}</p>
              <p className="text-sm text-stone-500">
                {formatDate(event.startsAt)}
                {event.venue ? ` · ${event.venue}` : ""}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <p className="text-sm text-stone-500">Print or share this report</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="border-[#c57a3a] text-[#c57a3a] hover:bg-[#c57a3a]/10"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<CheckSquare className="h-6 w-6" />}
          label="Tasks Complete"
          value={`${taskCompletePct}%`}
          sub={`${taskCompleted} of ${taskTotal} tasks`}
          accent={taskCompletePct >= 80 ? "green" : taskCompletePct >= 50 ? "neutral" : "red"}
        />
        <SummaryCard
          icon={
            budgetVariance <= 0 ? (
              <TrendingDown className="h-6 w-6 text-emerald-600" />
            ) : (
              <TrendingUp className="h-6 w-6 text-red-500" />
            )
          }
          label="Budget Variance"
          value={`${budgetVariance > 0 ? "+" : ""}${formatCAD(budgetVariance)}`}
          sub={budgetVariance <= 0 ? "Under budget" : "Over budget"}
          accent={budgetVariance <= 0 ? "green" : "red"}
        />
        <SummaryCard
          icon={<Building2 className="h-6 w-6" />}
          label="Vendors Confirmed"
          value={`${vendorConfirmed} of ${vendorTotal}`}
          sub={vendorTotal > 0 ? `${Math.round((vendorConfirmed / vendorTotal) * 100)}% confirmed` : undefined}
          accent={vendorConfirmed === vendorTotal && vendorTotal > 0 ? "green" : "neutral"}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Risks"
          value={`${riskOpen} open`}
          sub={`${riskResolved} resolved`}
          accent={riskOpen === 0 ? "green" : riskOpen >= 3 ? "red" : "neutral"}
        />
      </div>

      {/* Ticket / Revenue summary */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <DollarSign className="h-4 w-4 text-[#c57a3a]" />
            Ticket Sales & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Paid Orders</p>
            <p className="mt-1 text-xl font-bold text-stone-900">
              {orderStats.paidOrdersCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide">Revenue Collected</p>
            <p className="mt-1 text-xl font-bold text-stone-900">
              {formatCAD(orderStats.totalRevenueCents)}
            </p>
          </div>
          {event && (
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wide">Estimated Revenue</p>
              <p className="mt-1 text-xl font-bold text-stone-900">
                {formatCAD(event.capacity * event.ticketPriceCents)}
              </p>
              <p className="text-xs text-stone-500">
                {event.capacity} × {formatCAD(event.ticketPriceCents)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task completion chart */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <CheckSquare className="h-4 w-4 text-[#c57a3a]" />
            Task Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskTotal === 0 ? (
            <p className="text-sm text-stone-500">No tasks found.</p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="flex h-6 w-full overflow-hidden rounded-full bg-stone-100">
                {TASK_STATUS_ORDER.map((status) => {
                  const count = taskByStatus[status] ?? 0
                  const pct = taskTotal > 0 ? (count / taskTotal) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={status}
                      title={`${TASK_STATUS_LABELS[status]}: ${count}`}
                      className={cn("transition-all", TASK_STATUS_COLORS[status])}
                      style={{ width: `${pct}%` }}
                    />
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {TASK_STATUS_ORDER.map((status) => {
                  const count = taskByStatus[status] ?? 0
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <div
                        className={cn("h-3 w-3 rounded-sm", TASK_STATUS_COLORS[status])}
                      />
                      <span className="text-xs text-stone-600">
                        {TASK_STATUS_LABELS[status]}{" "}
                        <span className="font-semibold text-stone-800">{count}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Budget breakdown table */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <DollarSign className="h-4 w-4 text-[#c57a3a]" />
            Budget Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budget.length === 0 ? (
            <p className="text-sm text-stone-500">No budget items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Estimated</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.map((item) => {
                    const variance = item.actualCents - item.estimatedCents
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs text-stone-500">
                          {item.category}
                        </TableCell>
                        <TableCell className="font-medium text-stone-800">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-right text-stone-700">
                          {formatCAD(item.estimatedCents)}
                        </TableCell>
                        <TableCell className="text-right text-stone-700">
                          {formatCAD(item.actualCents)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            variance > 0
                              ? "text-red-600"
                              : variance < 0
                              ? "text-emerald-600"
                              : "text-stone-500"
                          )}
                        >
                          {variance > 0 ? "+" : ""}
                          {formatCAD(variance)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              item.status === "PAID"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : item.status === "OVERDUE"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : item.status === "CONFIRMED"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-stone-200 text-stone-600"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableBody>
                  <TableRow className="border-t-2 border-stone-300 font-bold">
                    <TableCell colSpan={2} className="font-bold text-stone-900">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-stone-900">
                      {formatCAD(budgetEstimatedTotal)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-stone-900">
                      {formatCAD(budgetActualTotal)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        budgetVariance > 0
                          ? "text-red-600"
                          : budgetVariance < 0
                          ? "text-emerald-600"
                          : "text-stone-600"
                      )}
                    >
                      {budgetVariance > 0 ? "+" : ""}
                      {formatCAD(budgetVariance)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor status list */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <Building2 className="h-4 w-4 text-[#c57a3a]" />
            Vendor Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <p className="text-sm text-stone-500">No vendors found.</p>
          ) : (
            <div className="space-y-4">
              {VENDOR_STATUS_ORDER.map((status) => {
                const group = vendors.filter((v) => v.status === status)
                if (group.length === 0) return null
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", VENDOR_STATUS_BADGE[status])}
                      >
                        {status}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {group.length} vendor{group.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {group.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 rounded-md border border-stone-100 bg-stone-50/50 px-3 py-2"
                        >
                          <span className="text-xs text-stone-500 w-20 shrink-0">
                            {v.vendorType}
                          </span>
                          <span className="text-sm font-medium text-stone-800 truncate">
                            {v.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist completion */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <CheckSquare className="h-4 w-4 text-[#c57a3a]" />
            Checklist Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checklists.length === 0 ? (
            <p className="text-sm text-stone-500">No checklists found.</p>
          ) : (
            <div className="space-y-4">
              {checklists.map((cl) => {
                const allItems = getChecklistItems(cl)
                const total = allItems.length
                const completed = allItems.filter((i) => i.isCompleted).length
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={cl.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800">{cl.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-stone-500">
                          {completed}/{total}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            pct === 100
                              ? "text-emerald-600"
                              : pct >= 50
                              ? "text-amber-600"
                              : "text-red-500"
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className={cn(
                        "h-2",
                        pct === 100 ? "[&>div]:bg-emerald-500" : pct >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-400"
                      )}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk summary */}
      <Card className="border-stone-200 bg-white/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-800">
            <AlertTriangle className="h-4 w-4 text-[#c57a3a]" />
            Risk Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {risks.length === 0 ? (
            <p className="text-sm text-stone-500">No risks logged.</p>
          ) : (
            <>
              {/* By severity */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  By Severity
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskSeverity[]).map(
                    (sev) => {
                      const count = risks.filter((r) => r.severity === sev).length
                      if (count === 0) return null
                      return (
                        <div
                          key={sev}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                            RISK_SEVERITY_BADGE[sev]
                          )}
                        >
                          {sev}
                          <span className="font-bold">{count}</span>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>

              {/* By status */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  By Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["OPEN", "MITIGATED", "ACCEPTED", "RESOLVED"] as RiskStatus[]).map(
                    (st) => {
                      const count = risks.filter((r) => r.status === st).length
                      if (count === 0) return null
                      return (
                        <div
                          key={st}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                            RISK_STATUS_BADGE[st]
                          )}
                        >
                          {st}
                          <span className="font-bold">{count}</span>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>

              {/* Risk list */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-center">Severity</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell>
                          <p className="font-medium text-stone-800">{risk.title}</p>
                          {risk.description && (
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                              {risk.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              RISK_SEVERITY_BADGE[risk.severity]
                            )}
                          >
                            {risk.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              RISK_STATUS_BADGE[risk.status]
                            )}
                          >
                            {risk.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-stone-400 pt-4 border-t border-stone-200">
        Generated {new Date().toLocaleDateString("en-CA")} · Event ID: {eventId}
      </div>
    </div>
  )
}
