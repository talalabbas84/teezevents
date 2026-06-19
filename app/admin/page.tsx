import Link from "next/link"
import {
  ArrowRight,
  BarChart2,
  Bell,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  LayoutTemplate,
  ShoppingBag,
  Ticket,
  Users,
  Wallet,
  Zap,
} from "lucide-react"

import { AdminInsightsDashboard } from "@/components/admin-insights-dashboard"
import { AdminEventsTable } from "@/components/admin/admin-events-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, getAdminDashboardData, getCheckoutSetupIssue } from "@/lib/checkout"
import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) return "TBA"
  return startsAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function isToday(date: Date | null) {
  if (!date) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isUpcomingSoon(date: Date | null) {
  if (!date) return false
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}

const QUICK_ACTIONS = [
  { label: "Check-In", icon: DoorOpen, href: "/admin/check-in", color: "bg-primary text-primary-foreground", desc: "Scan tickets at the door" },
  { label: "Planning", icon: ClipboardList, href: "/admin/planning", color: "bg-blue-600 text-white", desc: "Tasks, budget & timeline" },
  { label: "Events", icon: CalendarDays, href: "/admin/events", color: "bg-violet-600 text-white", desc: "Manage all events" },
  { label: "Notifications", icon: Bell, href: "/admin/notifications", color: "bg-amber-500 text-white", desc: "Alerts & updates" },
  { label: "Automations", icon: Zap, href: "/admin/automations", color: "bg-emerald-600 text-white", desc: "Rules & triggers" },
  { label: "Blueprints", icon: LayoutTemplate, href: "/admin/blueprints", color: "bg-rose-600 text-white", desc: "Event templates" },
  { label: "Vendors", icon: ShoppingBag, href: "/admin/vendors", color: "bg-cyan-600 text-white", desc: "Vendor directory" },
  { label: "Team", icon: Users, href: "/admin/team", color: "bg-slate-700 text-white", desc: "Manage access" },
]

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const prisma = getPrismaClient()
  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null
  let setupIssue: ReturnType<typeof getCheckoutSetupIssue> | null = null

  const [unreadCount] = await Promise.all([
    prisma.notification.count({ where: { isRead: false } }).catch(() => 0),
  ])

  try {
    dashboard = await getAdminDashboardData()
  } catch (error) {
    setupIssue = getCheckoutSetupIssue(error)
  }

  const activeEvent = dashboard?.events.find((e) => isToday(e.startsAt))
  const upcomingEvent = !activeEvent ? dashboard?.events.find((e) => isUpcomingSoon(e.startsAt)) : null
  const heroEvent = activeEvent ?? upcomingEvent

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-3 py-5 sm:px-4 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Dashboard</h1>
          </div>
          <Link
            href="/admin/notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background shadow-sm"
          >
            <Bell size={18} className="text-foreground/70" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#F7EDDB]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>

        {setupIssue || !dashboard ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Dashboard Setup</div>
              <h2 className="font-serif text-3xl font-bold">{setupIssue?.title || "Dashboard unavailable"}</h2>
              <p className="leading-relaxed text-muted-foreground">
                {setupIssue?.description || "The admin dashboard could not connect to the live event data."}
              </p>
              {setupIssue?.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Hero: Active / Upcoming Event ─────────────────────────────── */}
            {heroEvent && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#c57a3a] to-[#a0612e] p-5 text-white shadow-xl">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -bottom-12 -right-4 h-56 w-56 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    {isToday(heroEvent.startsAt) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
                        Live Today
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                        <CalendarDays size={11} />
                        Coming Up
                      </span>
                    )}
                    <span className="text-xs text-white/70">{formatEventDate(heroEvent.startsAt)}</span>
                  </div>
                  <h2 className="mt-3 font-serif text-2xl font-bold leading-tight sm:text-3xl">
                    {heroEvent.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                    <span>{heroEvent.ticketsIssued} tickets</span>
                    <span>{heroEvent.checkedInCount} checked in</span>
                    <span>{formatCurrency(heroEvent.revenueCents, "cad")} revenue</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/admin/check-in"
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-[#c57a3a] shadow-sm transition-opacity hover:opacity-90"
                    >
                      <DoorOpen size={16} />
                      Door Check-In
                    </Link>
                    <Link
                      href={`/admin/planning/${heroEvent.id}/dashboard`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-white/30"
                    >
                      <ClipboardList size={16} />
                      Planning
                    </Link>
                    <Link
                      href={`/admin/events/${heroEvent.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-white/30"
                    >
                      Manage
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stats ─────────────────────────────────────────────────────── */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <Card className="border border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Ticket size={18} className="text-primary" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tickets</div>
                    <div className="font-serif text-2xl font-bold">{dashboard.summary.ticketsIssued}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Wallet size={18} className="text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revenue</div>
                    <div className="font-serif text-2xl font-bold">{formatCurrency(dashboard.summary.grossRevenueCents, "cad")}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                    <DoorOpen size={18} className="text-blue-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Checked In</div>
                    <div className="font-serif text-2xl font-bold">{dashboard.summary.checkedInCount}</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
                    <CalendarDays size={18} className="text-violet-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Events</div>
                    <div className="font-serif text-2xl font-bold">{dashboard.events.length}</div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ── Quick Actions ──────────────────────────────────────────────── */}
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-3 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-95 sm:p-4"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.color} shadow-sm`}>
                      <action.icon size={20} />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Events + Analytics tabs ────────────────────────────────────── */}
            <Tabs defaultValue="events" className="space-y-4">
              <div className="no-scrollbar overflow-x-auto rounded-2xl border border-border bg-background p-1.5 shadow-sm">
                <TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0 md:min-w-0">
                  <TabsTrigger value="events" className="min-h-10 px-4 py-2">
                    {`Events (${dashboard.events.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="min-h-10 px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <BarChart2 size={14} />
                      Analytics
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Events tab */}
              <TabsContent value="events" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Search, filter, and sort all events.</p>
                  <Button asChild variant="outline" size="sm" className="border-primary text-primary">
                    <Link href="/admin/events">
                      <span className="inline-flex items-center gap-1.5">
                        Event Studio
                        <ArrowRight size={13} />
                      </span>
                    </Link>
                  </Button>
                </div>
                <AdminEventsTable
                  events={dashboard.events.map((e) => ({
                    id: e.id,
                    title: e.title,
                    startsAt: e.startsAt,
                    capacity: e.capacity,
                    paidOrders: e.paidOrders,
                    ticketsIssued: e.ticketsIssued,
                    checkedInCount: e.checkedInCount,
                    remainingCapacity: e.remainingCapacity,
                    revenueCents: e.revenueCents,
                    sellThroughRate: e.sellThroughRate,
                    checkInRate: e.checkInRate,
                  }))}
                />
              </TabsContent>

              {/* Analytics tab */}
              <TabsContent value="analytics" className="space-y-6">
                <AdminInsightsDashboard
                  summary={{
                    sellThroughRate: dashboard.summary.sellThroughRate,
                    checkInRate: dashboard.summary.checkInRate,
                    averageOrderValueCents: dashboard.summary.averageOrderValueCents,
                    remainingCapacity: dashboard.summary.remainingCapacity,
                    compOrders: dashboard.summary.compOrders,
                    pendingTickets: dashboard.summary.pendingTickets,
                    ticketDeliveryRate: dashboard.summary.ticketDeliveryRate,
                    discountAmountCents: dashboard.summary.discountAmountCents,
                  }}
                  events={dashboard.events}
                  salesTimeline={dashboard.salesTimeline.map((point) => ({
                    label: point.label,
                    orders: point.orders || 0,
                    tickets: point.tickets || 0,
                    revenueCents: point.revenueCents || 0,
                  }))}
                  checkInTimeline={dashboard.checkInTimeline.map((point) => ({
                    label: point.label,
                    checkedInCount: point.checkedInCount || 0,
                  }))}
                  topTicketTiers={dashboard.topTicketTiers}
                  voucherUsage={dashboard.voucherUsage}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  )
}
