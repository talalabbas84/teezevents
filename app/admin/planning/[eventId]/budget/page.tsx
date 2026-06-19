import { getEventBudget } from "@/lib/planning/queries"
import { BudgetClient } from "@/components/planning/budget-table"
import { PageGuide } from "@/components/admin/page-guide"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function BudgetPage({ params }: PageProps) {
  const { eventId } = await params
  const budgetItems = await getEventBudget(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <PageGuide
            id="planning-budget"
            title="Budget Tracker"
            subtitle="Keep your event finances organized and on track"
            steps={[
              { title: "Set your total budget", description: "Enter the overall budget for the event at the top so you can see how much is left." },
              { title: "Add budget items", description: "Tap '+ Add Item' for each expense: venue, catering, entertainment, marketing, etc." },
              { title: "Enter actual costs", description: "As you confirm expenses, update the Actual column. The tracker shows you over/under budget." },
              { title: "Watch the totals", description: "The summary at the top shows Total Budget, Total Spent, and Remaining at a glance." },
            ]}
            tips={[
              "Add a 10% contingency buffer to your budget for unexpected costs",
              "Mark items as Paid once invoices are settled so you know what's outstanding",
            ]}
          />
        </div>
        <BudgetClient eventId={eventId} initialItems={budgetItems} />
      </div>
    </main>
  )
}
