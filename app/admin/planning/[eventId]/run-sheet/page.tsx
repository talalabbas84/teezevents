import { getEventRunSheet } from "@/lib/planning/queries"
import { RunSheetClient } from "@/components/planning/run-sheet-editor"
import { PageGuide } from "@/components/admin/page-guide"

export default async function RunSheetPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const items = await getEventRunSheet(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <PageGuide
            id="planning-run-sheet"
            title="Run Sheet"
            subtitle="The minute-by-minute schedule for your event day"
            steps={[
              { title: "Add a time block", description: "Tap '+ Add Item' to add an event segment: guest arrival, speeches, dinner service, etc." },
              { title: "Set times", description: "Give each block a start time and duration. The run sheet stays in chronological order." },
              { title: "Assign responsibility", description: "Assign each item to a team member or vendor so everyone knows who's in charge." },
              { title: "Export or share", description: "Print or share the run sheet with your team before the event day." },
            ]}
            tips={[
              "Build your run sheet at least 1 week before the event",
              "Include buffer time between segments — things rarely run exactly on schedule",
              "Share a read-only copy with vendors so they know when they're needed",
            ]}
          />
        </div>
        <RunSheetClient eventId={eventId} initialItems={items} />
      </div>
    </main>
  )
}
