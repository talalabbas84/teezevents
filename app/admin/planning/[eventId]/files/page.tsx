import { getPrismaClient } from "@/lib/prisma"
import { FilesClient } from "@/components/planning/files-manager"
import type { FileSerialized } from "@/components/planning/files-manager"

export default async function FilesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const prisma = getPrismaClient()

  const [files, event] = await Promise.all([
    prisma.eventFile.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    }),
  ])

  const serialized: FileSerialized[] = files.map((f) => ({
    id: f.id,
    eventId: f.eventId,
    category: f.category,
    name: f.name,
    url: f.url,
    mimeType: f.mimeType ?? null,
    sizeBytes: f.sizeBytes ?? null,
    uploadedBy: f.uploadedBy,
    taskId: f.taskId ?? null,
    vendorId: f.vendorId ?? null,
    description: f.description ?? null,
    createdAt: f.createdAt.toISOString(),
  }))

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm text-stone-500">
            {event?.title ?? eventId}
          </p>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Files &amp; Documents
          </h1>
        </div>
        <FilesClient eventId={eventId} initialFiles={serialized} />
      </div>
    </main>
  )
}
