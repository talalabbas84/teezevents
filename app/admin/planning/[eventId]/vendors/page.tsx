import { getEventVendors } from "@/lib/planning/queries"
import { VendorsClient } from "@/components/planning/vendors-table"
import { PageGuide } from "@/components/admin/page-guide"

interface PageProps {
  params: Promise<{ eventId: string }>
}

export default async function VendorsPage({ params }: PageProps) {
  const { eventId } = await params
  const vendors = await getEventVendors(eventId)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <PageGuide
            id="planning-vendors"
            title="Vendor Management"
            subtitle="Track all the suppliers and service providers for your event"
            steps={[
              { title: "Add a vendor", description: "Tap '+ Add Vendor' to record a supplier: caterer, DJ, photographer, venue, etc." },
              { title: "Set their status", description: "Update the status as things progress: Contacted → Negotiating → Confirmed → Cancelled." },
              { title: "Track the contract", description: "Record their quote, contracted amount, and payment status so nothing falls through the cracks." },
              { title: "Add notes", description: "Use the notes field to store contact details, special requirements, or anything important." },
            ]}
            tips={[
              "Set a follow-up date to get reminded to check in with a vendor",
              "Confirmed vendors show in green — aim to have all vendors confirmed at least 2 weeks before the event",
            ]}
          />
        </div>
        <VendorsClient eventId={eventId} initialVendors={vendors} />
      </div>
    </main>
  )
}
