"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  ListChecks,
  Radio,
} from "lucide-react"

import { cn } from "@/lib/utils"

const SUB_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, slug: "dashboard" },
  { label: "Tasks", icon: CheckSquare, slug: "tasks" },
  { label: "Checklists", icon: ListChecks, slug: "checklists" },
  { label: "Timeline", icon: CalendarDays, slug: "timeline" },
  { label: "Budget", icon: DollarSign, slug: "budget" },
  { label: "Vendors", icon: Building2, slug: "vendors" },
  { label: "Run Sheet", icon: ClipboardList, slug: "run-sheet" },
  { label: "Risks", icon: AlertTriangle, slug: "risks" },
  { label: "Reports", icon: BarChart3, slug: "reports" },
  { label: "Post-Event", icon: ClipboardCheck, slug: "post-event" },
]

interface PlanningWorkspaceShellProps {
  eventId: string
  eventTitle: string
  eventDate: string | null
  children: React.ReactNode
}

export function PlanningWorkspaceShell({
  eventId,
  eventTitle,
  eventDate,
  children,
}: PlanningWorkspaceShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header + sub-nav */}
      <div className="sticky top-0 z-20 bg-background shadow-sm">
        {/* Top header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/events/${eventId}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span aria-hidden="true">←</span>
              <span>Event Studio</span>
            </Link>

            <div className="h-4 w-px bg-border" aria-hidden="true" />

            <div>
              <h1 className="font-serif text-lg font-bold leading-tight">{eventTitle}</h1>
              {eventDate && (
                <p className="text-xs text-muted-foreground">{eventDate}</p>
              )}
            </div>
          </div>

          {/* Go Live badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700">
            <Radio size={11} className="animate-pulse" />
            Go Live
          </div>
        </div>

        {/* Horizontal scrollable sub-nav */}
        <div className="overflow-x-auto border-b border-border">
          <nav className="flex w-max min-w-full items-center gap-1 px-4 py-2 lg:px-6">
            {SUB_NAV_ITEMS.map(({ label, icon: Icon, slug }) => {
              const href = `/admin/planning/${eventId}/${slug}`
              const isActive = pathname.startsWith(href)

              return (
                <Link
                  key={slug}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground rounded-full px-4 py-1.5"
                      : "text-foreground/70 hover:text-foreground px-4 py-1.5"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
