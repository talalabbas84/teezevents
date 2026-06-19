"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BarChart3,
  Bell,
  ClipboardList,
  DoorOpen,
  Download,
  Globe2,
  LayoutTemplate,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings2,
  Store,
  Users,
  X,
  Zap,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: BarChart3, exact: true },
  { label: "Event Studio", href: "/admin/events", icon: Settings2 },
  { label: "Planning", href: "/admin/planning", icon: ClipboardList },
  { label: "Blueprints", href: "/admin/blueprints", icon: LayoutTemplate },
  { label: "Team", href: "/admin/team", icon: Users },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Automations", href: "/admin/automations", icon: Zap },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Check-In", href: "/admin/check-in", icon: DoorOpen },
  { label: "Website CMS", href: "/admin/cms", icon: Globe2 },
]

const MOBILE_PRIMARY_ITEMS = [
  { label: "Home", href: "/admin", icon: BarChart3, exact: true },
  { label: "Events", href: "/admin/events", icon: Settings2 },
  { label: "Planning", href: "/admin/planning", icon: ClipboardList },
  { label: "Check-In", href: "/admin/check-in", icon: DoorOpen },
]

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, item.exact)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/75 hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon
              size={16}
              className={active ? "opacity-100" : "text-muted-foreground group-hover:text-foreground"}
            />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Branding */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">TEEZ</div>
          <div className="mt-0.5 text-sm font-semibold text-foreground">Admin</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        <NavLinks onClose={onClose} />
      </nav>

      {/* Data exports */}
      <div className="shrink-0 space-y-0.5 border-t border-border p-3">
        <div className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Data
        </div>
        <a
          href="/api/admin/exports/orders"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/75 hover:bg-muted hover:text-foreground"
        >
          <Download size={14} className="text-muted-foreground" />
          Orders CSV
        </a>
        <a
          href="/api/admin/exports/tickets"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/75 hover:bg-muted hover:text-foreground"
        >
          <Download size={14} className="text-muted-foreground" />
          Attendees CSV
        </a>
      </div>

      {/* Sign Out */}
      <div className="shrink-0 border-t border-border p-3">
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-muted hover:text-foreground"
          >
            <LogOut size={16} className="text-muted-foreground" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === "/admin/login" || pathname === "/admin/accept-invite") {
    return <>{children}</>
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      {/* Desktop sidebar — fixed, full height */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-border lg:bg-background lg:shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="safe-top-pad sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-background/90 px-4 shadow-sm backdrop-blur-xl lg:hidden">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-primary">TEEZ</span>
          <span className="block text-[11px] font-medium text-muted-foreground">Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 max-h-[74dvh] overflow-hidden rounded-3xl border border-border bg-background shadow-2xl lg:hidden">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <nav className="safe-bottom-pad fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-2 pt-2 shadow-[0_-12px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {MOBILE_PRIMARY_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon size={19} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open more navigation"
          >
            <MoreHorizontal size={19} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Main content offset by sidebar width on desktop */}
      <div className="pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pl-56 lg:pb-0">{children}</div>
    </>
  )
}
