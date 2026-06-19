import { getEventTasks } from "@/lib/planning/queries"
import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { TasksWorkspace } from "@/components/planning/tasks-workspace"

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
      select: { id: true, email: true, name: true, avatarColor: true },
    }),
  ])

  const teamMembers = members.map((member) => ({
    email: member.email,
    name: member.name,
    avatarColor: member.avatarColor,
  }))

  return (
    <div className="min-h-screen bg-[#F7EDDB]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold tracking-wide text-[#c57a3a]">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all tasks for this event.
          </p>
        </div>

        <TasksWorkspace
          tasks={tasks}
          eventId={eventId}
          currentUserEmail={session.email}
          teamMembers={teamMembers}
        />
      </div>
    </div>
  )
}
