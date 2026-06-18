import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"

import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) return "TBA"
  return startsAt.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isUpcoming(startsAt: Date | null) {
  if (!startsAt) return true
  return startsAt.getTime() >= Date.now()
}

function getPlanningStatusStyles(status: string): string {
  switch (status) {
    case "DRAFT":     return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
    case "PLANNING":  return "border-blue-400/40 bg-blue-500/10 text-blue-700"
    case "READY":     return "border-amber-400/40 bg-amber-500/10 text-amber-700"
    case "LIVE":      return "border-green-500/40 bg-green-500/10 text-green-700"
    case "COMPLETED": return "border-indigo-400/40 bg-indigo-500/10 text-indigo-700"
    case "CANCELLED": return "border-red-400/40 bg-red-500/10 text-red-700"
    case "ARCHIVED":  return "border-muted-foreground/20 bg-muted/30 text-muted-foreground/70"
    default:          return "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
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

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const upcoming = isUpcoming(event.startsAt)

              return (
                <Card
                  key={event.id}
                  className="overflow-hidden border border-border shadow-lg transition-shadow hover:shadow-xl"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full bg-muted">
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
                  </div>

                  <CardContent className="flex flex-col gap-4 p-5">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={upcoming ? "default" : "secondary"}>
                        {upcoming ? "UPCOMING" : "PAST"}
                      </Badge>
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

                    {/* Title + date */}
                    <div>
                      <h2 className="font-serif text-xl font-bold leading-snug">
                        {event.title}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays size={13} />
                        {formatEventDate(event.startsAt)}
                      </p>
                    </div>

                    {/* Counts */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{event._count.planningTasks} tasks</span>
                      <span className="h-3 w-px bg-border" />
                      <span>{event._count.eventVendors} vendors</span>
                      <span className="h-3 w-px bg-border" />
                      <span>{event._count.checklists} checklists</span>
                    </div>

                    {/* Progress indicator */}
                    {(() => {
                      const total = event._count.planningTasks + event._count.eventVendors + event._count.checklists
                      const progressMap: Record<string, number> = {
                        DRAFT: 5,
                        PLANNING: 25,
                        READY: 60,
                        LIVE: 80,
                        COMPLETED: 100,
                        CANCELLED: 0,
                        ARCHIVED: 100,
                      }
                      const pct = total > 0 ? progressMap[event.planningStatus] ?? 0 : 0
                      return (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-1 rounded-full transition-all",
                              event.planningStatus === "CANCELLED" ? "bg-red-400" :
                              event.planningStatus === "LIVE" ? "bg-green-500" :
                              event.planningStatus === "COMPLETED" || event.planningStatus === "ARCHIVED" ? "bg-indigo-500" :
                              "bg-primary"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )
                    })()}

                    {/* CTA */}
                    <Button
                      asChild
                      className="mt-auto w-full bg-primary text-primary-foreground hover:bg-accent"
                    >
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
            })}
          </div>
        )}
      </div>
    </main>
  )
}
