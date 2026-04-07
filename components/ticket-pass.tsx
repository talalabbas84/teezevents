import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock3, MapPin, QrCode } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type TicketPassProps = {
  eventTitle: string
  eventDate: string
  eventTime?: string | null
  venue?: string | null
  location?: string | null
  holderName: string
  orderNumber: string
  ticketCode: string
  ticketIndex: number
  totalTickets: number
  qrCodeSrc: string
  ticketHref: string
  checkedInAt?: Date | null
  adminCheckInAction?: string
  adminRedirectTo?: string
}

export function TicketPass({
  eventTitle,
  eventDate,
  eventTime,
  venue,
  location,
  holderName,
  orderNumber,
  ticketCode,
  ticketIndex,
  totalTickets,
  qrCodeSrc,
  ticketHref,
  checkedInAt,
  adminCheckInAction,
  adminRedirectTo,
}: TicketPassProps) {
  const isCheckedIn = Boolean(checkedInAt)

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-xl">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6 p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.26em] text-primary">Digital Ticket</div>
              <h2 className="text-3xl font-serif font-bold text-balance">{eventTitle}</h2>
            </div>
            <Badge variant={isCheckedIn ? "secondary" : "default"}>
              {isCheckedIn ? "Checked In" : "Valid"}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="text-primary" />
              <span>{eventDate}</span>
            </div>
            {eventTime && (
              <div className="flex items-center gap-3">
                <Clock3 size={16} className="text-primary" />
                <span>{eventTime}</span>
              </div>
            )}
            {(venue || location) && (
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-primary" />
                <span>{venue && location ? `${venue} • ${location}` : venue || location}</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-3xl border border-primary/15 bg-primary/10 p-5 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ticket Holder</div>
              <div className="mt-1 font-medium">{holderName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Order</div>
              <div className="mt-1 font-medium">{orderNumber}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ticket Code</div>
              <div className="mt-1 font-mono text-sm">{ticketCode}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Seat Count</div>
              <div className="mt-1 font-medium">{`Ticket ${ticketIndex} of ${totalTickets}`}</div>
            </div>
          </div>

          {checkedInAt && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-900">
              <CheckCircle2 size={18} />
              <span>{`Checked in on ${checkedInAt.toLocaleString("en-CA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href={ticketHref}>Open Ticket Page</Link>
            </Button>
            {adminCheckInAction && !isCheckedIn && (
              <form action={adminCheckInAction} method="post">
                <input type="hidden" name="redirectTo" value={adminRedirectTo || ticketHref} />
                <Button type="submit" variant="outline" className="border-2 border-primary text-primary">
                  Mark Checked In
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 border-t border-border bg-[#F5E7D1] p-6 lg:border-t-0 lg:border-l lg:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            <QrCode size={16} />
            Scan At Entry
          </div>
          <div className="rounded-[2rem] border border-primary/15 bg-white p-4 shadow-lg">
            <img src={qrCodeSrc} alt={`QR code for ${ticketCode}`} className="h-52 w-52" />
          </div>
          <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
            Present this QR code at the door. Each code maps to one issued ticket in the TEEZ admin dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
