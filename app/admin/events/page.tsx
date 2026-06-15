import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { AdminEventStudio } from "@/components/admin-event-studio"
import { Button } from "@/components/ui/button"
import { requireAdminSession } from "@/lib/admin-auth"
import { getAdminManagedEvents } from "@/lib/admin-events"

export default async function AdminEventsPage() {
  await requireAdminSession()
  const events = await getAdminManagedEvents()

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
            <h1 className="mt-2 text-5xl font-serif font-bold text-balance">Event Studio</h1>
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
              Create events, publish them to the website, mark featured placements, and manage checkout from one place.
            </p>
          </div>

          <Button asChild variant="outline" className="border-2 border-primary text-primary">
            <Link href="/admin">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Dashboard
              </span>
            </Link>
          </Button>
        </div>

        <AdminEventStudio
          events={events.map((event) => ({
            ...event,
            startsAt: event.startsAt?.toISOString() || null,
            gallery: Array.isArray(event.gallery) ? (event.gallery as string[]) : [],
            contentSections: Array.isArray(event.contentSections)
              ? (event.contentSections as Array<{ title: string; body: string[] }>)
              : [],
            vouchers: event.vouchers.map((voucher) => ({
              ...voucher,
              startsAt: voucher.startsAt?.toISOString() || null,
              expiresAt: voucher.expiresAt?.toISOString() || null,
            })),
          }))}
        />
      </div>
    </main>
  )
}
