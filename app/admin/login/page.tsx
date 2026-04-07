import { redirect } from "next/navigation"
import { ShieldCheck, Ticket } from "lucide-react"

import { AdminLoginForm } from "@/components/admin-login-form"
import { Card, CardContent } from "@/components/ui/card"
import { getAdminSetupIssue, isAdminAuthenticated } from "@/lib/admin-auth"

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated().catch(() => false)) {
    redirect("/admin")
  }

  const setupIssue = getAdminSetupIssue()

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3 text-primary">
          <Ticket className="h-8 w-8" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em]">TEEZ Admin</div>
            <div className="text-2xl font-serif font-bold">Event Operations Dashboard</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border border-border shadow-xl">
            <CardContent className="space-y-6 p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <ShieldCheck size={16} />
                Admin Access
              </div>
              <div>
                <h1 className="mb-4 text-5xl font-serif font-bold text-balance">Sign in to manage live ticketing</h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  View paid orders, issued tickets, check-in status, and event capacity from one place. This dashboard
                  reads directly from the same Stripe and Postgres-backed checkout flow.
                </p>
              </div>

              {setupIssue ? (
                <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-destructive">
                    Admin Setup Required
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{setupIssue}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Orders</div>
                    <div className="mt-2 text-2xl font-serif font-bold">Paid and pending</div>
                  </div>
                  <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tickets</div>
                    <div className="mt-2 text-2xl font-serif font-bold">Issued with QR codes</div>
                  </div>
                  <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Entry</div>
                    <div className="mt-2 text-2xl font-serif font-bold">Check-in tracking</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-xl">
            <CardContent className="space-y-6 p-8">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Login</div>
                <h2 className="mt-2 text-3xl font-serif font-bold">Dashboard credentials</h2>
              </div>
              <AdminLoginForm disabled={Boolean(setupIssue)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
