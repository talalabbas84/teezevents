import { AdminLayoutShell } from "@/components/admin-layout-shell"
import { AdminRealtimeListener } from "@/components/admin-realtime-listener"
import { getAdminSession } from "@/lib/admin-auth"
import { getUnreadCount } from "@/lib/notifications"
import { getNewInquiryCount } from "@/actions/contact"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  const bootstrapAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const recipientEmail = session?.email === bootstrapAdminEmail ? undefined : session?.email
  const [unreadCount, newInquiryCount] = await Promise.all([
    session ? getUnreadCount(recipientEmail) : Promise.resolve(0),
    session ? getNewInquiryCount() : Promise.resolve(0),
  ])

  return (
    <AdminLayoutShell unreadCount={unreadCount} newInquiryCount={newInquiryCount}>
      <AdminRealtimeListener currentEmail={session?.email ?? null} />
      {children}
    </AdminLayoutShell>
  )
}
