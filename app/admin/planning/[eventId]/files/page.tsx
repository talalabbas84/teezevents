import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTeamContext } from "@/lib/team-access"
import { FilesClient } from "@/components/planning/files-manager"
import type { FileFolderSerialized, FileSerialized } from "@/components/planning/files-manager"

const DEFAULT_ROOT_FOLDERS = [
  "Resources",
  "Important Links",
  "Contracts",
  "Vendor Documents",
  "Floor Plans",
  "Marketing Assets",
  "Receipts",
  "Run Sheets",
  "Photos",
  "Staff Instructions",
  "Other",
]

export default async function FilesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const prisma = getPrismaClient()
  const currentUser = await getCurrentTeamContext()

  await Promise.all(
    DEFAULT_ROOT_FOLDERS.map((name) =>
      prisma.eventFileFolder.upsert({
        where: { eventId_path: { eventId, path: name } },
        update: {},
        create: { eventId, name, path: name },
      })
    )
  )

  const folders = await prisma.eventFileFolder.findMany({
    where: { eventId },
    orderBy: [{ path: "asc" }],
  })

  await Promise.all(
    folders.map((folder) =>
      prisma.eventFile.updateMany({
        where: { eventId, folderId: null, folder: folder.path },
        data: { folderId: folder.id },
      })
    )
  )

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

  const serializedFolders: FileFolderSerialized[] = folders.map((folder) => ({
    id: folder.id,
    eventId: folder.eventId,
    parentId: folder.parentId ?? null,
    name: folder.name,
    path: folder.path,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }))

  const serialized: FileSerialized[] = files.map((f) => ({
    id: f.id,
    eventId: f.eventId,
    category: f.category,
    folderId: f.folderId ?? null,
    folder: f.folder,
    isImportant: f.isImportant,
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
        <FilesClient
          eventId={eventId}
          initialFiles={serialized}
          initialFolders={serializedFolders}
          uploaderEmail={currentUser.email}
        />
      </div>
    </main>
  )
}
