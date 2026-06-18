import Link from "next/link"
import { AlertTriangle, Building2, CheckSquare, DollarSign } from "lucide-react"
import { getPlanningDashboard } from "@/lib/planning/queries"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100)
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlanningDashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const data = await getPlanningDashboard(eventId)

  const { tasks, budget, vendors, risks, timeline, recentActivity } = data

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Page heading */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Planning
          </div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A live overview of your event planning progress.
          </p>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tasks.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tasks.byStatus.IN_PROGRESS} in progress
                {tasks.byStatus.BLOCKED > 0 && (
                  <span className="ml-1 text-destructive">· {tasks.byStatus.BLOCKED} blocked</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCents(budget.totalEstimatedCents)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCents(budget.totalActualCents)} actual
                <span className="ml-1 text-muted-foreground/60">
                  / {formatCents(budget.totalEstimatedCents)} est.
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Vendors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendors</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{vendors.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {vendors.byStatus.CONFIRMED} confirmed
              </p>
            </CardContent>
          </Card>

          {/* Risks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{risks.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {risks.byStatus.OPEN} open
                {risks.bySeverity.CRITICAL > 0 && (
                  <span className="ml-1 text-destructive">
                    · {risks.bySeverity.CRITICAL} critical
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Two-column section ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Upcoming Milestones (2/3) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Upcoming Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming milestones.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {timeline.upcoming.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <div className="w-24 shrink-0 text-xs text-muted-foreground">
                        {new Date(item.dueDate).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <p className="flex-1 truncate text-sm font-medium">{item.title}</p>
                      {item.category && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity (1/3) */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.slice(0, 10).map((log) => (
                    <li key={log.id} className="text-sm">
                      <p className="truncate font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.actorEmail} · {timeAgo(log.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/planning/${eventId}/tasks`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[#F7EDDB]"
            >
              <CheckSquare className="h-4 w-4 text-primary" />
              Add Task
            </Link>
            <Link
              href={`/admin/planning/${eventId}/budget`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[#F7EDDB]"
            >
              <DollarSign className="h-4 w-4 text-primary" />
              Manage Budget
            </Link>
            <Link
              href={`/admin/planning/${eventId}/run-sheet`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-[#F7EDDB]"
            >
              <AlertTriangle className="h-4 w-4 text-primary" />
              Run Sheet
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}
