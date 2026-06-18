import { getEventRunSheet } from "@/lib/planning/queries"
import { RunSheetClient } from "@/components/planning/run-sheet-editor"

export default async function RunSheetPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const items = await getEventRunSheet(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <RunSheetClient eventId={eventId} initialItems={items} />
    </main>
  )
}
