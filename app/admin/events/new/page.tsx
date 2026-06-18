import Link from "next/link"

import { requireAdminSession } from "@/lib/admin-auth"
import { NewEventForm } from "@/components/admin/new-event-form"

export const metadata = {
  title: "Create New Event — TEEZ Admin",
}

export default async function NewEventPage() {
  await requireAdminSession()

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <Link
            href="/admin/planning"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Planning
          </Link>
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            New Event
          </div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Create Event</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up a new event for planning. You can configure ticket sales, pricing, and publishing later in Event Studio.
          </p>
        </div>

        <NewEventForm />
      </div>
    </main>
  )
}
