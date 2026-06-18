import { getEventTasks } from "@/lib/planning/queries"
import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { TasksBoardClient } from "@/components/planning/tasks-board"
import type { TeamMemberOption } from "@/components/planning/assignee-select"

export default async function TasksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const db = getPrismaClient()
  const [tasks, session, members] = await Promise.all([
    getEventTasks(eventId),
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-wide text-[#c57a3a]">
            Task Board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all tasks for this event.
          </p>
        </div>

        <TasksBoardClient
          eventId={eventId}
          initialTasks={tasks}
          adminEmail={session.email}
          assignees={assignees}
        />
      </div>
    </div>
  )
}
