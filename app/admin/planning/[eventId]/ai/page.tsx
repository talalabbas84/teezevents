import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AiAssistantClient } from "@/components/planning/ai-assistant-client"

export default async function AiAssistantPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireAdminSession()
  const { eventId } = await params
  const event = await getPrismaClient().event.findUnique({ where: { id: eventId }, select: { title: true } })
  if (!event) notFound()

  return (
    <main className="min-h-screen bg-[#F7EDDB]">
      <AiAssistantClient eventId={eventId} eventTitle={event.title} />
    </main>
  )
}
