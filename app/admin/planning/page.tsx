import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlanningEventsBrowser } from "@/components/planning/planning-events-browser"

export default async function PlanningPage() {
  await requireAdminSession()

  const db = getPrismaClient()
  const events = await db.event.findMany({
    orderBy: [{ startsAt: "desc" }],
    select: {
      id: true,
      title: true,
      startsAt: true,
      category: true,
      image: true,
      isActive: true,
      planningStatus: true,
      _count: { select: { planningTasks: true, eventVendors: true, checklists: true } },
    },
  })
  const serializedEvents = events.map((event) => ({
    ...event,
    startsAt: event.startsAt?.toISOString() ?? null,
  }))

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              TEEZ Admin
            </div>
            <h1 className="mt-1.5 font-serif text-4xl font-bold">Planning</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Select an event to start planning
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="/admin/events/new">+ New Event</Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="p-10 text-center">
              <CalendarDays className="mx-auto mb-4 text-muted-foreground" size={40} />
              <h2 className="font-serif text-2xl font-bold">No events yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an event in the Event Studio to start planning.
              </p>
              <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-accent">
                <Link href="/admin/events">Go to Event Studio</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <PlanningEventsBrowser events={serializedEvents} />
        )}
      </div>
    </main>
  )
}
