import Link from "next/link"
import { ArrowLeft, DoorOpen } from "lucide-react"

import { AdminCheckInConsole } from "@/components/admin-check-in-console"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminDashboardData, getCheckoutSetupIssue } from "@/lib/checkout"
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

export default async function AdminCheckInPage() {
  await requireAdminSession()

  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null
  let setupIssue: ReturnType<typeof getCheckoutSetupIssue> | null = null

  try {
    dashboard = await getAdminDashboardData()
  } catch (error) {
    setupIssue = getCheckoutSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
            <h1 className="mt-2 text-5xl font-serif font-bold text-balance">Door Check-In</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Scan QR tickets at the door, verify holders instantly, and update entry status against the live ticket database.
            </p>
          </div>

          <Button asChild variant="outline" className="border-2 border-primary text-primary">
            <Link href="/admin">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Dashboard
              </span>
            </Link>
          </Button>
        </div>

        {setupIssue || !dashboard ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Check-In Setup</div>
              <h2 className="text-3xl font-serif font-bold">{setupIssue?.title || "Check-in unavailable"}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {setupIssue?.description || "The check-in console could not connect to the live event data."}
              </p>
              {setupIssue?.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <DoorOpen size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Checked In</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.checkedInCount}</div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <DoorOpen size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pending Entry</div>
                  <div className="text-3xl font-serif font-bold">
                    {dashboard.summary.ticketsIssued - dashboard.summary.checkedInCount}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <DoorOpen size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Live Events</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.events.length}</div>
                </CardContent>
              </Card>
            </div>

            <AdminCheckInConsole
              events={dashboard.events.map((event) => ({
                id: event.id,
                title: event.title,
                dateLabel: formatEventDate(event.startsAt),
                ticketsIssued: event.ticketsIssued,
                checkedInCount: event.checkedInCount,
              }))}
              recentCheckIns={dashboard.recentCheckIns.map((ticket) => ({
                ticketCode: ticket.ticketCode,
                eventTitle: ticket.order.eventTitleSnapshot,
                holderEmail: ticket.holderEmail,
                checkedInAt: ticket.checkedInAt?.toISOString() || "",
                orderNumber: ticket.order.orderNumber,
              }))}
            />
          </div>
        )}
      </div>
    </main>
  )
}
