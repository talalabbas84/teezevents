import Link from "next/link"
import { ArrowRight, CalendarDays, DoorOpen, Download, LogOut, Settings2, Ticket, Wallet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, getAdminDashboardData, getCheckoutSetupIssue } from "@/lib/checkout"
import { requireAdminSession } from "@/lib/admin-auth"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) {
    return "TBA"
  }

  return startsAt.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
            <h1 className="mt-2 text-5xl font-serif font-bold text-balance">Events</h1>
            <p className="mt-3 text-lg text-muted-foreground">{`Signed in as ${session.email}`}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <Link href="/admin/events">
                <span className="inline-flex items-center gap-2">
                  <Settings2 size={16} />
                  Event Studio
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <a href="/api/admin/exports/orders">
                <span className="inline-flex items-center gap-2">
                  <Download size={16} />
                  Orders CSV
                </span>
              </a>
            </Button>
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <a href="/api/admin/exports/tickets">
                <span className="inline-flex items-center gap-2">
                  <Download size={16} />
                  Attendees CSV
                </span>
              </a>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/check-in">
                <span className="inline-flex items-center gap-2">
                  <DoorOpen size={16} />
                  Check-In
                </span>
              </Link>
            </Button>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline" className="border-2 border-primary text-primary">
                <span className="inline-flex items-center gap-2">
                  <LogOut size={16} />
                  Sign Out
                </span>
              </Button>
            </form>
          </div>
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
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <Ticket className="text-primary" />
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Tickets Issued</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.ticketsIssued}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <Wallet className="text-primary" />
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Gross Revenue</div>
                  <div className="text-3xl font-serif font-bold">
                    {formatCurrency(dashboard.summary.grossRevenueCents, "cad")}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <DoorOpen className="text-primary" />
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Checked In</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.checkedInCount}</div>
                </CardContent>
              </Card>
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-5">
                  <CalendarDays className="text-primary" />
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Active Events</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.events.length}</div>
                </CardContent>
              </Card>
            </section>

            <section className="rounded-3xl border border-border bg-background shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Event Command Centers</div>
                  <h2 className="mt-2 text-3xl font-serif font-bold">Recent events</h2>
                </div>
                <Button asChild variant="outline" className="border-primary text-primary">
                  <Link href="/admin/events">
                    <span className="inline-flex items-center gap-2">
                      View All Events
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4 p-6 lg:grid-cols-3">
                {dashboard.events.slice(0, 6).map((event) => (
                  <Card key={event.id} className="border border-border bg-muted/10 shadow-sm">
                    <CardContent className="flex h-full flex-col gap-5 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatEventDate(event.startsAt)}</Badge>
                        <Badge variant={event.remainingCapacity > 0 ? "secondary" : "destructive"}>
                          {event.remainingCapacity > 0 ? `${event.remainingCapacity} left` : "Sold out"}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif font-bold">{event.title}</h3>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
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
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                          <Link href={`/admin/events/${event.id}`}>Open</Link>
                        </Button>
                        <Button asChild variant="outline" className="border-primary text-primary">
                          <Link href="/admin/events">Edit</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
