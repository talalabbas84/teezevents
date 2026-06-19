import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { getWebPushPublicKey, getWebPushSetupIssue } from "@/lib/web-push"
import { getNotificationPreferences } from "@/actions/notification-preferences"
import { PushNotificationManager } from "@/components/admin/push-notification-manager"
import { NotificationPreferencesClient } from "@/components/admin/notification-preferences-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

export default async function AdminSettingsPage() {
  const session = await requireAdminSession()
  const prisma = getPrismaClient()
  const [activePushSubscriptionCount, webPushSetupIssue, notificationPreferences] = await Promise.all([
    prisma.pushSubscription.count({
      where: {
        userEmail: session.email,
        isActive: true,
      },
    }),
    Promise.resolve(getWebPushSetupIssue()),
    getNotificationPreferences(),
  ])

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Settings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Application configuration and preferences.
          </p>
        </div>

        {/* General */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">General</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">General Settings</h2>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Admin email */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Admin Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="admin-email"
                    value={session.email}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                  <Button variant="outline" size="sm" disabled className="shrink-0">
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configured via the <code className="rounded bg-muted px-1 py-0.5">ADMIN_EMAIL</code> environment variable.
                </p>
              </div>

              {/* App name */}
              <div className="space-y-1.5">
                <Label htmlFor="app-name">Application Name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="app-name"
                    defaultValue="TEEZ Events"
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                  <Button variant="outline" size="sm" disabled className="shrink-0">
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Display name shown across the admin panel.
                </p>
              </div>
            </div>

            <Separator />

            {/* In-app notifications toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">In-App Notifications</div>
                <p className="text-sm text-muted-foreground">
                  Receive in-app notifications for planning activity and alerts.
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Push Notifications</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Phone Push</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get instant push notifications on your phone or desktop for new orders, planning alerts, and team activity.
                Install this site as a PWA (Add to Home Screen in Safari on iOS) to enable push on mobile.
              </p>
            </div>

            <Separator />

            <PushNotificationManager
              publicKey={getWebPushPublicKey()}
              activeSubscriptionCount={activePushSubscriptionCount}
            />

            {webPushSetupIssue ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                ⚠️ {webPushSetupIssue} Generate VAPID keys with{" "}
                <code className="rounded bg-amber-100 px-1">pnpm exec web-push generate-vapid-keys</code>.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Notification preferences */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Notifications</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Notification Preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose which events trigger a push notification to your phone and which send you an email.
                Push is on by default. Email is off by default.
              </p>
            </div>

            <Separator />

            <NotificationPreferencesClient initialPreferences={notificationPreferences} />
          </CardContent>
        </Card>

        {/* Planning defaults */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Planning</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">Planning Defaults</h2>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Default planning status */}
              <div className="space-y-1.5">
                <Label htmlFor="default-status">Default Planning Status (New Events)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="default-status"
                    value="DRAFT"
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                  <Button variant="outline" size="sm" disabled className="shrink-0">
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  New events are created with this planning status.
                </p>
              </div>

              {/* Default task priority */}
              <div className="space-y-1.5">
                <Label htmlFor="default-priority">Default Task Priority</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="default-priority"
                    value="MEDIUM"
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                  <Button variant="outline" size="sm" disabled className="shrink-0">
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied when creating tasks without an explicit priority.
                </p>
              </div>
            </div>

            <Separator />

            {/* Blueprint auto-apply */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Auto-apply Blueprint on Event Creation</div>
                <p className="text-sm text-muted-foreground">
                  Automatically suggest a blueprint when a new event is created.
                </p>
              </div>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-6 p-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">About</div>
              <h2 className="mt-1 font-serif text-2xl font-bold">System Information</h2>
            </div>

            <Separator />

            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Application Version
                </div>
                <div className="mt-1.5 font-serif text-xl font-bold">1.0.0</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Schema Version
                </div>
                <div className="mt-1.5 font-serif text-xl font-bold">2025.06</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Framework
                </div>
                <div className="mt-1.5 font-serif text-xl font-bold">Next.js 16</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              TEEZ Event Management Platform. Built with Next.js, Prisma, and Tailwind CSS.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
