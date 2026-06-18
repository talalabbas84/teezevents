import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTeamContext } from "@/lib/team-access"
import { NotesClient } from "@/components/planning/notes-client"

export default async function NotesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const prisma = getPrismaClient()
  const currentUser = await getCurrentTeamContext()

  const [notes, event] = await Promise.all([
    prisma.eventNote.findMany({
      where: { eventId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    }),
  ])

  const serialized = notes.map((n) => ({
    id: n.id,
    body: n.body,
    authorEmail: n.authorEmail,
    isPinned: n.isPinned,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm text-stone-500">
            {event?.title ?? eventId}
          </p>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Notes
          </h1>
        </div>
        <NotesClient eventId={eventId} initialNotes={serialized} authorEmail={currentUser.email} />
      </div>
    </main>
  )
}
