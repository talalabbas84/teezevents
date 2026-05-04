import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  DoorOpen,
  Download,
  Mail,
  ReceiptText,
  Settings2,
  Ticket,
  TicketPercent,
  Wallet,
} from "lucide-react"

import { AdminCompOrderForm } from "@/components/admin-comp-order-form"
import { AdminEventEmailActions } from "@/components/admin-event-email-actions"
import { AdminOrderActions } from "@/components/admin-order-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminSession } from "@/lib/admin-auth"
import { formatCurrency, getAdminEventOperationsData, getCheckoutSetupIssue } from "@/lib/checkout"
import { getTicketDeliverySetupIssue } from "@/lib/ticket-delivery"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) {
    return "TBA"
  }

  return startsAt.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatLongDate(startsAt: Date | null) {
  if (!startsAt) {
    return "Date to be announced"
  }

  return startsAt.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function statusVariant(status: string) {
  if (status === "PAID") {
    return "default" as const
  }

  if (status === "REFUNDED" || status === "CANCELED") {
    return "destructive" as const
  }

  return "outline" as const
}

export default async function AdminEventOperationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  await requireAdminSession()
  const { eventId } = await params
  const ticketDeliveryIssue = getTicketDeliverySetupIssue()
  let data: Awaited<ReturnType<typeof getAdminEventOperationsData>> | null = null
  let setupIssue: ReturnType<typeof getCheckoutSetupIssue> | null = null

  try {
    data = await getAdminEventOperationsData(eventId)
  } catch (error) {
    setupIssue = getCheckoutSetupIssue(error)
  }

  if (!setupIssue && !data) {
    notFound()
  }

  if (setupIssue || !data) {
    return (
      <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Event Setup</div>
              <h1 className="text-3xl font-serif font-bold">{setupIssue?.title || "Event unavailable"}</h1>
              <p className="text-muted-foreground leading-relaxed">
                {setupIssue?.description || "This event could not be loaded from the live event database."}
              </p>
              {setupIssue?.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const { event, summary, orders, tickets, ticketTiers, vouchers } = data
  const dateLabel = formatEventDate(event.startsAt)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" className="border-2 border-primary text-primary">
            <Link href="/admin">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Events
              </span>
            </Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <Link href="/admin/events">
                <span className="inline-flex items-center gap-2">
                  <Settings2 size={16} />
                  Pricing and Settings
                </span>
              </Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/check-in">
                <span className="inline-flex items-center gap-2">
                  <DoorOpen size={16} />
                  Check-In
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-border bg-background shadow-xl">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={event.checkoutEnabled ? "default" : "outline"}>
                  {event.checkoutEnabled ? "Checkout Live" : "Checkout Off"}
                </Badge>
                <Badge variant={event.isActive ? "secondary" : "outline"}>{event.isActive ? "Active" : "Archived"}</Badge>
                <Badge variant="outline">{dateLabel}</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-serif font-bold text-balance lg:text-5xl">{event.title}</h1>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <div className="inline-flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" />
                  {formatLongDate(event.startsAt)}
                </div>
                <div>{event.venue || "Venue TBA"}</div>
                <div>{event.address || "Address TBA"}</div>
              </div>
            </div>

            <div className="border-t border-border bg-muted/30 p-6 lg:border-l lg:border-t-0">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Event Health</div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-serif font-bold">{summary.ticketsSold}</div>
                  <div className="text-xs text-muted-foreground">Tickets sold</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold">{summary.remainingCapacity}</div>
                  <div className="text-xs text-muted-foreground">Spots left</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold">{formatPercent(summary.sellThroughRate)}</div>
                  <div className="text-xs text-muted-foreground">Sell through</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold">{formatPercent(summary.checkInRate)}</div>
                  <div className="text-xs text-muted-foreground">Checked in</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-background p-2 shadow-sm">
          {[
            ["Overview", "#overview"],
            ["Orders", "#orders"],
            ["Tickets", "#tickets"],
            ["Promotions", "#promotions"],
            ["Guest List", "#guest-list"],
          ].map(([label, href]) => (
            <Button key={href} asChild variant="ghost" size="sm">
              <a href={href}>{label}</a>
            </Button>
          ))}
        </nav>

        <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-border shadow-lg">
            <CardContent className="space-y-3 p-5">
              <Wallet className="text-primary" />
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Net Sales</div>
              <div className="text-3xl font-serif font-bold">{formatCurrency(summary.revenueCents, event.currency)}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-lg">
            <CardContent className="space-y-3 p-5">
              <ReceiptText className="text-primary" />
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Orders</div>
              <div className="text-3xl font-serif font-bold">{summary.paidOrders}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-lg">
            <CardContent className="space-y-3 p-5">
              <Mail className="text-primary" />
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Delivery</div>
              <div className="text-3xl font-serif font-bold">{formatPercent(summary.ticketDeliveryRate)}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-lg">
            <CardContent className="space-y-3 p-5">
              <TicketPercent className="text-primary" />
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Refunded</div>
              <div className="text-3xl font-serif font-bold">{formatCurrency(summary.refundedCents, event.currency)}</div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-5 p-6">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Mass Email</div>
                <h2 className="mt-2 text-2xl font-serif font-bold">Send ticket packs for this event</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Send unsent ticket emails before the event, or resend every paid order when plans change.
                </p>
              </div>
              <AdminEventEmailActions eventId={event.id} emailEnabled={!ticketDeliveryIssue} />
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Operations</div>
                <h2 className="mt-2 text-2xl font-serif font-bold">Exports and live tools</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="border-primary text-primary">
                  <a href="/api/admin/exports/orders">
                    <span className="inline-flex items-center gap-2">
                      <Download size={16} />
                      Export Orders
                    </span>
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-primary text-primary">
                  <a href="/api/admin/exports/tickets">
                    <span className="inline-flex items-center gap-2">
                      <Download size={16} />
                      Export Attendees
                    </span>
                  </a>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href="/admin/check-in">
                    <span className="inline-flex items-center gap-2">
                      <DoorOpen size={16} />
                      Open Check-In
                    </span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="orders" className="rounded-3xl border border-border bg-background shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Orders</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Sales, comps, and refunds</h2>
            </div>
            <Badge variant="outline">{`${orders.length} total orders`}</Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{order.source === "ADMIN_COMP" ? "Complimentary" : "Checkout"}</span>
                        {order.ticketTierNameSnapshot && (
                          <span className="text-xs text-muted-foreground">{order.ticketTierNameSnapshot}</span>
                        )}
                        {order.internalLabel && <span className="text-xs text-muted-foreground">{order.internalLabel}</span>}
                        {order.voucherCodeSnapshot && (
                          <span className="text-xs text-muted-foreground">{`Voucher ${order.voucherCodeSnapshot}`}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                        {order.ticketEmailLastSentAt ? (
                          <span className="text-xs text-muted-foreground">{`Sent to ${order.ticketEmailLastSentTo || order.customerEmail}`}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No ticket email sent</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{formatCurrency(order.totalPriceCents, order.currency)}</span>
                        {order.discountAmountCents > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {`Saved ${formatCurrency(order.discountAmountCents, order.currency)}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AdminOrderActions
                        orderId={order.id}
                        accessToken={order.accessToken}
                        defaultEmail={order.customerEmail}
                        emailEnabled={!ticketDeliveryIssue && order.status === "PAID"}
                        customerName={order.customerName}
                        customerPhone={order.customerPhone}
                        notes={order.notes}
                        internalLabel={order.internalLabel}
                        quantity={order.quantity}
                        source={order.source}
                        ticketTierName={order.ticketTierNameSnapshot}
                        voucherCode={order.voucherCodeSnapshot}
                        totalLabel={formatCurrency(order.totalPriceCents, order.currency)}
                        status={order.status}
                        canRefund={order.source === "CHECKOUT" && order.status === "PAID" && order.totalPriceCents > 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section id="guest-list">
          <AdminCompOrderForm
            events={[
              {
                id: event.id,
                title: event.title,
                dateLabel,
              },
            ]}
            ticketEmailConfigured={!ticketDeliveryIssue}
          />
        </section>

        <section id="promotions" className="grid gap-6 xl:grid-cols-2">
          <Card className="border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ticket Tiers</div>
                  <h2 className="mt-2 text-2xl font-serif font-bold">Pricing performance</h2>
                </div>
                <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                  <Link href="/admin/events">Edit</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {ticketTiers.length > 0 ? (
                  ticketTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                      <div>
                        <div className="font-medium">{tier.name}</div>
                        <div className="text-sm text-muted-foreground">{`${tier.soldCount} sold at ${formatCurrency(tier.priceCents, event.currency)}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(tier.revenueCents, event.currency)}</div>
                        <Badge variant={tier.isActive ? "secondary" : "outline"}>{tier.isActive ? "Active" : "Off"}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    This event is using the base ticket price.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Vouchers</div>
                  <h2 className="mt-2 text-2xl font-serif font-bold">Promo and one-time codes</h2>
                </div>
                <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                  <Link href="/admin/events">Generate</Link>
                </Button>
              </div>
              <div className="space-y-3">
                {vouchers.length > 0 ? (
                  vouchers.map((voucher) => (
                    <div key={voucher.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                      <div>
                        <div className="font-mono text-sm font-semibold">{voucher.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {voucher.discountType === "FIXED"
                            ? `${formatCurrency(voucher.amountOffCents || 0, event.currency)} off`
                            : `${voucher.percentOff || 0}% off`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{`${voucher.redemptionCount}${voucher.maxRedemptions ? ` / ${voucher.maxRedemptions}` : ""}`}</div>
                        <div className="text-xs text-muted-foreground">{`${formatCurrency(voucher.discountCents, event.currency)} discounted`}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    No vouchers have been created for this event yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="tickets" className="rounded-3xl border border-border bg-background shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Tickets</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Attendee ticket feed</h2>
            </div>
            <Badge variant="outline">{`${tickets.length} issued ticket records`}</Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.ticketCode}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{ticket.holderName}</span>
                        <span className="text-xs text-muted-foreground">{ticket.holderEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={ticket.order.status === "PAID" ? (ticket.checkedInAt ? "secondary" : "default") : "destructive"}>
                          {ticket.order.status === "PAID" ? (ticket.checkedInAt ? "Checked In" : "Issued") : ticket.order.status}
                        </Badge>
                        {ticket.checkedInAt && (
                          <span className="text-xs text-muted-foreground">
                            {ticket.checkedInAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                        <Link href={`/tickets/code/${ticket.ticketCode}`}>
                          <span className="inline-flex items-center gap-1">
                            <Ticket size={14} />
                            View
                          </span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  )
}
