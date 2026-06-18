import { AdminLayoutShell } from "@/components/admin-layout-shell"
import { AdminRealtimeListener } from "@/components/admin-realtime-listener"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutShell>
      <AdminRealtimeListener />
      {children}
    </AdminLayoutShell>
  )
}
