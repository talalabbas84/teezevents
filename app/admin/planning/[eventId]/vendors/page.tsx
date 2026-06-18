import { getEventVendors } from "@/lib/planning/queries"
import { VendorsClient } from "@/components/planning/vendors-table"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function VendorsPage({ params }: PageProps) {
  const { eventId } = await params
  const vendors = await getEventVendors(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <VendorsClient eventId={eventId} initialVendors={vendors} />
    </main>
  )
}
