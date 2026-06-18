import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { GlobalVendorsClient } from "@/components/admin/global-vendors-client"

export default async function AdminVendorsPage() {
  await requireAdminSession()

  const db = getPrismaClient()

  const [vendors, vendorTypeCounts] = await Promise.all([
    db.globalVendor.findMany({
      orderBy: { name: "asc" },
      where: { isActive: true },
    }),
    db.eventVendor.groupBy({
      by: ["vendorType"],
      _count: { id: true },
    }),
  ])

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Global Vendors</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your reusable vendor directory shared across all events.
          </p>
        </div>

        <GlobalVendorsClient initialVendors={vendors} />
      </div>
    </main>
  )
}
