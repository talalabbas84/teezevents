import { getEventBudget } from "@/lib/planning/queries"
import { BudgetClient } from "@/components/planning/budget-table"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function BudgetPage({ params }: PageProps) {
  const { eventId } = await params
  const budgetItems = await getEventBudget(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <BudgetClient eventId={eventId} initialItems={budgetItems} />
    </main>
  )
}
