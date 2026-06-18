import { notFound } from "next/navigation"
import { getPrismaClient } from "@/lib/prisma"
import { requireEventAccess } from "@/lib/team-access"
import { PlanningWorkspaceShell } from "@/components/planning-workspace-shell"

export default async function PlanningLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  await requireEventAccess(eventId, "VIEW")
  const db = getPrismaClient()
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true, planningStatus: true },
  })
  if (!event) notFound()

  return (
    <PlanningWorkspaceShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.startsAt?.toISOString() ?? null}
      planningStatus={event.planningStatus}
    >
      {children}
    </PlanningWorkspaceShell>
  )
}
