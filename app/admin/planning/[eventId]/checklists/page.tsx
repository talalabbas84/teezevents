import { getEventChecklists } from "@/lib/planning/queries"
import type { ChecklistSerialized } from "@/lib/planning/types"
import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { ChecklistsPanelClient } from "@/components/planning/checklists-panel"
import type { TeamMemberOption } from "@/components/planning/assignee-select"

export default async function ChecklistsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const db = getPrismaClient()
  const [checklists, session, members] = await Promise.all([
    getEventChecklists(eventId),
    requireAdminSession(),
    db.teamMember.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, role: true, avatarColor: true },
    }),
  ])

  const assignees: TeamMemberOption[] = members.map((member) => ({
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    avatarColor: member.avatarColor,
  }))

  if (!assignees.some((member) => member.email === session.email)) {
    assignees.unshift({
      id: "current-admin",
      email: session.email,
      name: "Current Admin",
      role: "SUPER_ADMIN",
      avatarColor: "#c57a3a",
    })
  }

  return (
    <div className="min-h-screen bg-[#F7EDDB]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-wide text-[#c57a3a]">
            Checklists
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track preparation items across all event categories.
          </p>
        </div>

        <ChecklistsPanelClient
          eventId={eventId}
          initialChecklists={checklists}
          currentEmail={session.email}
          assignees={assignees}
        />
      </div>
    </div>
  )
}
