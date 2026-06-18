import { redirect } from "next/navigation"

export default async function PlanningRootPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  redirect(`/admin/planning/${eventId}/dashboard`)
}
