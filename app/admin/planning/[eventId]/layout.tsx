import { notFound } from "next/navigation"
import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { PlanningWorkspaceShell } from "@/components/planning-workspace-shell"

export default async function PlanningLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}) {
  await requireAdminSession()
  const { eventId } = await params
  const db = getPrismaClient()
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true },
  })
  if (!event) notFound()

  return (
    <PlanningWorkspaceShell
      eventId={event.id}
      eventTitle={event.title}
      eventDate={event.startsAt?.toISOString() ?? null}
    >
      {children}
    </PlanningWorkspaceShell>
  )
}
