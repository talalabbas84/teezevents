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
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Compact header — no wasted space on mobile */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="font-serif text-xl font-bold text-[#c57a3a] sm:text-2xl lg:text-3xl">
            Tasks
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
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
