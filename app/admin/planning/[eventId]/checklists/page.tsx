import { getEventChecklists } from "@/lib/planning/queries"
import type { ChecklistSerialized } from "@/lib/planning/types"
import { ChecklistsPanelClient } from "@/components/planning/checklists-panel"

export default async function ChecklistsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const checklists = await getEventChecklists(eventId)

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

        <ChecklistsPanelClient eventId={eventId} initialChecklists={checklists} />
      </div>
    </div>
  )
}
