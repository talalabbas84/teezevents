import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { AutomationsClient } from "@/components/admin/automations-client"

export const metadata = {
  title: "Automations | TEEZ Admin",
}

export default async function AutomationsPage() {
  await requireAdminSession()

  const db = getPrismaClient()
  const rules = await db.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Serialize dates — Prisma DateTime cannot be passed directly to client components
  const serialized = rules.map((r) => ({
    ...r,
    actionPayload: r.actionPayload as unknown,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: undefined, // strip internal field
  }))

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            TEEZ Admin
          </div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Automations</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create automated workflows that run when events happen in your planning system.
          </p>
        </div>

        {/* Client component with full CRUD UI */}
        <AutomationsClient rules={serialized} />
      </div>
    </main>
  )
}
