import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import {
  getEventTasks,
  getEventBudget,
  getEventVendors,
  getEventRisks,
  getEventChecklists,
} from "@/lib/planning/queries"
import { ReportsClient } from "@/components/planning/event-reports"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function ReportsPage({ params }: PageProps) {
  const { eventId } = await params
  await requireAdminSession()

  const db = getPrismaClient()

  const [tasks, budget, vendors, risks, checklists, event, orderStats] =
    await Promise.all([
      getEventTasks(eventId),
      getEventBudget(eventId),
      getEventVendors(eventId),
      getEventRisks(eventId),
      getEventChecklists(eventId),
      db.event.findUnique({
        where: { id: eventId },
        select: {
          title: true,
          capacity: true,
          ticketPriceCents: true,
          startsAt: true,
          venue: true,
        },
      }),
      db.ticketOrder.aggregate({
        where: { eventId, status: "PAID" },
        _count: { id: true },
        _sum: { totalPriceCents: true },
      }),
    ])

  const reportData = {
    tasks,
    budget,
    vendors,
    risks,
    checklists,
    event: event
      ? {
          title: event.title,
          capacity: event.capacity,
          ticketPriceCents: event.ticketPriceCents,
          startsAt: event.startsAt ? event.startsAt.toISOString() : null,
          venue: event.venue,
        }
      : null,
    orderStats: {
      paidOrdersCount: orderStats._count.id,
      totalRevenueCents: orderStats._sum.totalPriceCents ?? 0,
    },
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <ReportsClient eventId={eventId} data={reportData} />
    </main>
  )
}
