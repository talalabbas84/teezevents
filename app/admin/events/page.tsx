import { AdminEventStudio } from "@/components/admin-event-studio"
import { requireAdminSession } from "@/lib/admin-auth"
import { getAdminManagedEvents } from "@/lib/admin-events"

export default async function AdminEventsPage() {
  await requireAdminSession()
  const events = await getAdminManagedEvents()

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 text-4xl font-serif font-bold">Event Studio</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create events, publish them to the website, and manage checkout from one place.
          </p>
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
