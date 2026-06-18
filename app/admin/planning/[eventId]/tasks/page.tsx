import { getEventTasks } from "@/lib/planning/queries"
import type { PlanningTaskSerialized, TaskStatus, TaskPriority } from "@/lib/planning/types"
import { TasksBoardClient } from "@/components/planning/tasks-board"

export default async function TasksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const tasks = await getEventTasks(eventId)

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

        <TasksBoardClient eventId={eventId} initialTasks={tasks} />
      </div>
    </div>
  )
}
