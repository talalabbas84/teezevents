import { requireAdminSession } from "@/lib/admin-auth"
import { getNotifications, getUnreadCount } from "@/lib/notifications"
import { NotificationsClient } from "@/components/admin/notifications-client"

export default async function AdminNotificationsPage() {
  await requireAdminSession()

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(100),
    getUnreadCount(),
  ])

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
          <h1 className="mt-1.5 font-serif text-4xl font-bold">Notifications</h1>
        </div>

        <NotificationsClient initialNotifications={notifications} unreadCount={unreadCount} />
      </div>
    </main>
  )
}
