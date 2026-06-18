import { getEventRisks } from "@/lib/planning/queries"
import { RisksClient } from "@/components/planning/risks-manager"

export default async function RisksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const risks = await getEventRisks(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <RisksClient eventId={eventId} initialRisks={risks} />
    </main>
  )
}
