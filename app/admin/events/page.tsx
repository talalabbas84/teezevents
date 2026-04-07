import Link from "next/link"
import { ArrowLeft, CreditCard, Settings2 } from "lucide-react"

import { AdminEventStudio } from "@/components/admin-event-studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
              Manage live event inventory, tiered pricing, voucher campaigns, delete/archive flows, checkout settings,
              and public visibility from one place.
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

        <Card className="border border-border shadow-xl">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">What Changes Here</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Public pages and checkout update from the database</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Event cards, event detail pages, checkout pages, and live spots-left counts now reflect the managed
                event records below. Static catalog content still fills in galleries and richer sections when available.
              </p>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CreditCard size={16} className="text-primary" />
                Development Stripe
              </div>
              <div className="mt-2">
                Local checkout can run with Stripe test keys. For full webhook behavior in development, run Stripe CLI
                forwarding to <code>/api/stripe/webhook</code> while using your local app URL.
              </div>
            </div>
          </CardContent>
        </Card>

        {events.length === 0 ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="flex items-center gap-3 text-primary">
                <Settings2 size={18} />
                <div className="text-sm font-semibold uppercase tracking-[0.22em]">No Managed Events Yet</div>
              </div>
              <p className="text-muted-foreground">
                Create your first live event below. Once saved, it will appear in reports, checkout, and admin
                operations automatically.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <AdminEventStudio
          events={events.map((event) => ({
            ...event,
            startsAt: event.startsAt?.toISOString() || null,
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
