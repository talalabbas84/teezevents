import { getEventTimeline } from "@/lib/planning/queries"
import { TimelineClient } from "@/components/planning/timeline-view"

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const items = await getEventTimeline(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <TimelineClient eventId={eventId} initialItems={items} />
    </main>
  )
}
