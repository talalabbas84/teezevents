import Link from "next/link"
import { ArrowRight, CalendarDays, DoorOpen, Ticket, Wallet } from "lucide-react"

import { AdminInsightsDashboard } from "@/components/admin-insights-dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, getAdminDashboardData, getCheckoutSetupIssue } from "@/lib/checkout"
import { requireAdminSession } from "@/lib/admin-auth"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) return "TBA"
  return startsAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null
  let setupIssue: ReturnType<typeof getCheckoutSetupIssue> | null = null

  try {
    dashboard = await getAdminDashboardData()
  } catch (error) {
    setupIssue = getCheckoutSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 text-4xl font-serif font-bold">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{`Signed in as ${session.email}`}</p>
        </div>

        {setupIssue || !dashboard ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Dashboard Setup</div>
              <h2 className="text-3xl font-serif font-bold">{setupIssue?.title || "Dashboard unavailable"}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {setupIssue?.description || "The admin dashboard could not connect to the live event data."}
              </p>
              {setupIssue?.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary metrics — always visible */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <Ticket className="text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tickets Issued</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.ticketsIssued}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <Wallet className="text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Gross Revenue</div>
                  <div className="text-3xl font-serif font-bold">
                    {formatCurrency(dashboard.summary.grossRevenueCents, "cad")}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <DoorOpen className="text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Checked In</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.checkedInCount}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <CalendarDays className="text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Active Events</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.events.length}</div>
                </CardContent>
              </Card>
            </section>

            {/* Tabbed sections */}
            <Tabs defaultValue="events" className="space-y-6">
              <div className="overflow-x-auto rounded-2xl border border-border bg-background p-2 shadow-sm">
                <TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0 md:min-w-0">
                  <TabsTrigger value="events" className="px-4 py-2">
                    {`Events (${dashboard.events.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="px-4 py-2">
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Events tab */}
              <TabsContent value="events" className="space-y-0">
                <section className="rounded-3xl border border-border bg-background shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Event Command Centers</div>
                      <h2 className="mt-1.5 text-2xl font-serif font-bold">Recent Events</h2>
                    </div>
                    <Button asChild variant="outline" className="border-primary text-primary">
                      <Link href="/admin/events">
                        <span className="inline-flex items-center gap-2">
                          View All in Studio
                          <ArrowRight size={16} />
                        </span>
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-4 p-6 lg:grid-cols-3">
                    {dashboard.events.slice(0, 6).map((event) => (
                      <Card key={event.id} className="border border-border bg-muted/10 shadow-sm">
                        <CardContent className="flex h-full flex-col gap-4 p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatEventDate(event.startsAt)}</Badge>
                            <Badge variant={event.remainingCapacity > 0 ? "secondary" : "destructive"}>
                              {event.remainingCapacity > 0 ? `${event.remainingCapacity} left` : "Sold out"}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-xl font-serif font-bold">{event.title}</h3>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>{`${event.paidOrders} orders`}</div>
                              <div>{`${event.ticketsIssued} tickets`}</div>
                              <div>{`${event.checkedInCount} checked in`}</div>
                              <div>{formatCurrency(event.revenueCents, "cad")}</div>
                            </div>
                          </div>
                          <div className="mt-auto grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background/70 p-3 text-sm">
                            <div>
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sell Through</div>
                              <div className="mt-1 text-xl font-serif font-bold">{formatPercent(event.sellThroughRate)}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Door</div>
                              <div className="mt-1 text-xl font-serif font-bold">{formatPercent(event.checkInRate)}</div>
                            </div>
                          </div>
                          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                            <Link href={`/admin/events/${event.id}`}>Open Command Center</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
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
