import { notFound } from "next/navigation"

import { CollaborationClient } from "@/components/planning/collaboration-client"
import { PageGuide } from "@/components/admin/page-guide"
import type {
  CollaborationActivitySerialized,
  CollaborationCommentSerialized,
  CollaborationMemberSerialized,
  CollaborationResourceSerialized,
} from "@/components/planning/collaboration-client"
import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTeamContext } from "@/lib/team-access"

type RawComment = {
  id: string
  eventId: string
  authorEmail: string
  authorName: string | null
  body: string
  entityType: string | null
  entityId: string | null
  mentions: string[]
  isEdited: boolean
  isPinned: boolean
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  replies?: RawComment[]
}

function serializeComment(comment: RawComment): CollaborationCommentSerialized {
  return {
    id: comment.id,
    eventId: comment.eventId,
    authorEmail: comment.authorEmail,
    authorName: comment.authorName,
    body: comment.body,
    entityType: comment.entityType,
    entityId: comment.entityId,
    mentions: comment.mentions,
    isEdited: comment.isEdited,
    isPinned: comment.isPinned,
    parentId: comment.parentId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: (comment.replies ?? []).map((reply) => ({
      ...serializeComment(reply),
      replies: [],
    })),
  }
}

export default async function CollaborationPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const currentUser = await getCurrentTeamContext()
  const prisma = getPrismaClient()

  const [event, comments, members, activity, resources] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    }),
    prisma.eventComment.findMany({
      where: { eventId, parentId: null },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
      take: 100,
    }),
    prisma.teamMember.findMany({
      where: { status: { not: "DISABLED" } },
      include: {
        eventAccess: {
          where: { eventId },
          select: { accessLevel: true },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }, { email: "asc" }],
    }),
    prisma.planningActivityLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        actorEmail: true,
        action: true,
        entityType: true,
        entityName: true,
        createdAt: true,
      },
    }),
    prisma.eventFile.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        url: true,
        category: true,
        uploadedBy: true,
        createdAt: true,
      },
    }),
  ])

  if (!event) notFound()

  const serializedMembers: CollaborationMemberSerialized[] = members.map((member) => ({
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    status: member.status,
    avatarColor: member.avatarColor,
    lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    accessLevel:
      member.eventAccess[0]?.accessLevel ??
      (member.role === "SUPER_ADMIN" || member.role === "ADMIN" ? "MANAGE" : null),
  }))

  if (!serializedMembers.some((member) => member.email === currentUser.email)) {
    serializedMembers.unshift({
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
      status: currentUser.status,
      avatarColor: "#c57a3a",
      lastActiveAt: new Date().toISOString(),
      accessLevel: "MANAGE",
    })
  }

  const serializedActivity: CollaborationActivitySerialized[] = activity.map((item) => ({
    id: item.id,
    actorEmail: item.actorEmail,
    action: item.action,
    entityType: item.entityType,
    entityName: item.entityName,
    createdAt: item.createdAt.toISOString(),
  }))

  const serializedResources: CollaborationResourceSerialized[] = resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    url: resource.url,
    category: resource.category,
    uploadedBy: resource.uploadedBy,
    createdAt: resource.createdAt.toISOString(),
  }))

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* Compact header — collapses on mobile to event name + section name */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary sm:tracking-[0.28em]">
            {event.title}
          </p>
          <h1 className="mt-0.5 font-serif text-2xl font-bold sm:mt-1.5 sm:text-3xl lg:text-4xl">
            Collaboration
          </h1>
        </div>

        <div className="mb-4 sm:mb-6">
          <PageGuide
            id="planning-collaboration"
            title="Team Collaboration"
            subtitle="Post updates, ask questions, and keep everyone in the loop"
            steps={[
              { title: "Post an update", description: "Type your message in the composer at the top and tap Post. Everyone on the team can see it." },
              { title: "Mention someone", description: "Type @ followed by their name to notify a specific person. They'll get a notification." },
              { title: "Reply to a message", description: "Tap 'Reply' under any post to start a thread. Use threads to keep discussions organized." },
              { title: "Attach files", description: "Tap the paperclip icon to attach images, PDFs, or documents to your message." },
            ]}
            tips={[
              "Pin important messages so they stay at the top for everyone",
              "You can edit or delete your own messages by tapping '...'",
              "The activity feed on the right shows recent changes across the whole event",
            ]}
          />
        </div>

        <CollaborationClient
          eventId={event.id}
          eventTitle={event.title}
          currentEmail={currentUser.email}
          initialComments={comments.map((comment) => serializeComment(comment as RawComment))}
          teamMembers={serializedMembers}
          activity={serializedActivity}
          resources={serializedResources}
        />
      </div>
    </main>
  )
}
