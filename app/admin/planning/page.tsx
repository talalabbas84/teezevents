import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"

import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
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

export default async function PlanningPage() {
  await requireAdminSession()

  const db = getPrismaClient()
  const events = await db.event.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      category: true,
      image: true,
      isActive: true,
    },
  })

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            TEEZ Admin
          </div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Planning</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Select an event to start planning
          </p>
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
