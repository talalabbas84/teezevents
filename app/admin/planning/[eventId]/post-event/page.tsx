import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { PostEventClient } from "@/components/planning/post-event-review"
import { getEventBudget } from "@/lib/planning/queries"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function PostEventPage({ params }: PageProps) {
  const { eventId } = await params
  await requireAdminSession()

  const db = getPrismaClient()

  const [review, event, budgetItems, vendorCount] = await Promise.all([
    db.postEventReview.findUnique({ where: { eventId } }),
    db.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        capacity: true,
        ticketPriceCents: true,
        startsAt: true,
      },
    }),
    getEventBudget(eventId),
    db.eventVendor.count({ where: { eventId } }),
  ])

  const serializedReview = review
    ? {
        id: review.id,
        eventId: review.eventId,
        actualAttendance: review.actualAttendance,
        actualRevenueCents: review.actualRevenueCents,
        teamFeedback: review.teamFeedback,
        whatWentWell: review.whatWentWell,
        whatWentWrong: review.whatWentWrong,
        lessonsLearned: review.lessonsLearned,
        improvementNotes: review.improvementNotes,
        overallRating: review.overallRating,
        savedToBlueprint: review.savedToBlueprint,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      }
    : null

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <PostEventClient
        eventId={eventId}
        event={event
          ? {
              title: event.title,
              capacity: event.capacity,
              ticketPriceCents: event.ticketPriceCents,
              startsAt: event.startsAt ? event.startsAt.toISOString() : null,
            }
          : null}
        review={serializedReview}
        budgetItems={budgetItems}
        vendorCount={vendorCount}
      />
    </main>
  )
}
