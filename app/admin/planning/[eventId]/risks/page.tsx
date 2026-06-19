import { getEventRisks } from "@/lib/planning/queries"
import { RisksClient } from "@/components/planning/risks-manager"
import { PageGuide } from "@/components/admin/page-guide"

export default async function RisksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const risks = await getEventRisks(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <PageGuide
            id="planning-risks"
            title="Risk Register"
            subtitle="Identify potential problems before they become real ones"
            steps={[
              { title: "Log a risk", description: "Tap '+ Add Risk' to record anything that could go wrong: weather, vendor cancellation, low ticket sales." },
              { title: "Rate the risk", description: "Set the Likelihood (how probable) and Impact (how bad). High likelihood + high impact = urgent." },
              { title: "Plan your response", description: "Write a mitigation plan: what will you do if this happens? Who is responsible?" },
              { title: "Update as things change", description: "Mark risks as Mitigated or Occurred as the event approaches." },
            ]}
            tips={[
              "Common risks: venue double-booking, key vendor cancellation, weather for outdoor events, tech failures",
              "A risk log shows sponsors and stakeholders you're taking the event seriously",
            ]}
          />
        </div>
        <RisksClient eventId={eventId} initialRisks={risks} />
      </div>
    </main>
  )
}
