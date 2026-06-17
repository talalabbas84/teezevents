import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  DoorOpen,
  Download,
  Mail,
  MessageSquareText,
  ReceiptText,
  Ticket,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react"

import { AdminCompOrderForm } from "@/components/admin-comp-order-form"
import { AdminDiscountCodeGenerator } from "@/components/admin-discount-code-generator"
import { AdminEventEmailActions } from "@/components/admin-event-email-actions"
import { AdminEventEmailCampaignComposer } from "@/components/admin-event-email-campaign-composer"
import { AdminEventMarketingKit } from "@/components/admin-event-marketing-kit"
import { AdminOrderActions } from "@/components/admin-order-actions"
import { EventEditorCard, type AdminManagedEventView } from "@/components/admin-event-studio"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminSession } from "@/lib/admin-auth"
import { getAdminManagedEvent } from "@/lib/admin-events"
import { formatCurrency, getAdminEventOperationsData, getCheckoutSetupIssue } from "@/lib/checkout"
import { getEventEmailCampaignHistory } from "@/lib/marketing"
import { getTicketDeliverySetupIssue } from "@/lib/ticket-delivery"

function formatEventDate(startsAt: Date | null) {
  if (!startsAt) return "TBA"
  return startsAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
}

function formatLongDate(startsAt: Date | null) {
  if (!startsAt) return "Date to be announced"
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
  if (status === "PAID") return "default" as const
  if (status === "REFUNDED" || status === "CANCELED") return "destructive" as const
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
  let managedEvent: AdminManagedEventView | null = null

  const [opsResult, managedResult] = await Promise.allSettled([
    getAdminEventOperationsData(eventId),
    getAdminManagedEvent(eventId),
  ])

  if (opsResult.status === "rejected") {
    setupIssue = getCheckoutSetupIssue(opsResult.reason)
  } else {
    data = opsResult.value
  }

  if (managedResult.status === "fulfilled" && managedResult.value) {
    const raw = managedResult.value
    managedEvent = {
      ...raw,
      startsAt: raw.startsAt?.toISOString() || null,
      gallery: Array.isArray(raw.gallery) ? (raw.gallery as string[]) : [],
      contentSections: Array.isArray(raw.contentSections)
        ? (raw.contentSections as Array<{ title: string; body: string[] }>)
        : [],
      vouchers: raw.vouchers.map((v) => ({
        ...v,
        startsAt: v.startsAt?.toISOString() || null,
        expiresAt: v.expiresAt?.toISOString() || null,
      })),
    }
  }

  if (!setupIssue && !data) notFound()

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

  const { event, summary, orders, tickets, rsvps, audienceEvents, ticketTiers, vouchers } = data
  const emailCampaignHistory = await getEventEmailCampaignHistory(event.id)
  const dateLabel = formatEventDate(event.startsAt)
  const uniqueAudiencePool = audienceEvents.reduce((total, ae) => total + ae.uniqueRecipients, 0)
  const unsentPaidOrders = Math.max(summary.paidOrders - summary.deliveredOrders, 0)
  const averageOrderValueCents =
    summary.paidOrders > 0 ? Math.round(summary.revenueCents / summary.paidOrders) : 0

  const overviewStats = [
    { label: "Net Sales", value: formatCurrency(summary.revenueCents, event.currency) },
    { label: "Orders", value: summary.paidOrders },
    { label: "Avg Order", value: formatCurrency(averageOrderValueCents, event.currency) },
    { label: "Refunded", value: formatCurrency(summary.refundedCents, event.currency) },
    { label: "Delivery", value: formatPercent(summary.ticketDeliveryRate) },
    { label: "Emails Due", value: unsentPaidOrders },
    { label: "Pending Holds", value: summary.pendingTickets },
    { label: "Audience Pool", value: uniqueAudiencePool },
    { label: "RSVP Leads", value: rsvps.length },
    { label: "Text Opt-ins", value: summary.rsvpSmsOptIns },
  ]

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Event Studio
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">{event.title}</span>
        </div>

        {/* Event header card */}
        <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5 p-5 lg:p-6">
            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={event.checkoutEnabled ? "default" : "outline"} className="text-xs">
                  {event.checkoutEnabled ? "Checkout Live" : "Checkout Off"}
                </Badge>
                <Badge variant={event.isActive ? "secondary" : "outline"} className="text-xs">
                  {event.isActive ? "Active" : "Archived"}
                </Badge>
                <Badge variant="outline" className="text-xs">{dateLabel}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-serif font-bold lg:text-3xl">{event.title}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-primary" />
                  {formatLongDate(event.startsAt)}
                </span>
                {event.venue && <span>{event.venue}</span>}
                {event.address && <span>{event.address}</span>}
              </div>
            </div>

            {/* Compact health stats */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
              {[
                { label: "Sold", value: summary.ticketsSold },
                { label: "Remaining", value: summary.remainingCapacity },
                { label: "Sell-through", value: formatPercent(summary.sellThroughRate) },
                { label: "Checked in", value: formatPercent(summary.checkInRate) },
              ].map((stat) => (
                <div key={stat.label} className="text-sm">
                  <div className="text-xl font-serif font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabs — sticky so they stay visible while scrolling content */}
        <Tabs defaultValue="overview" className="space-y-5">
          <div className="sticky top-14 z-10 -mx-4 px-4 lg:-mx-8 lg:px-8 lg:top-0">
            <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
              <TabsList className="h-auto min-w-max justify-start gap-0.5 bg-transparent p-1.5">
                <TabsTrigger value="overview" className="rounded-lg px-3.5 py-1.5 text-sm">Overview</TabsTrigger>
                <TabsTrigger value="orders" className="rounded-lg px-3.5 py-1.5 text-sm">{`Orders (${orders.length})`}</TabsTrigger>
                <TabsTrigger value="tickets" className="rounded-lg px-3.5 py-1.5 text-sm">{`Tickets (${tickets.length})`}</TabsTrigger>
                <TabsTrigger value="rsvps" className="rounded-lg px-3.5 py-1.5 text-sm">{`RSVPs (${rsvps.length})`}</TabsTrigger>
                <TabsTrigger value="promotions" className="rounded-lg px-3.5 py-1.5 text-sm">Promotions</TabsTrigger>
                <TabsTrigger value="email" className="rounded-lg px-3.5 py-1.5 text-sm">Email</TabsTrigger>
                <TabsTrigger value="marketing" className="rounded-lg px-3.5 py-1.5 text-sm">Marketing</TabsTrigger>
                <TabsTrigger value="guest-list" className="rounded-lg px-3.5 py-1.5 text-sm">Guest List</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg px-3.5 py-1.5 text-sm">Edit Event</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              {/* Header with quick-action links */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Event Metrics</span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/admin/exports/orders"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Download size={12} />
                    Orders CSV
                  </a>
                  <a
                    href="/api/admin/exports/tickets"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Download size={12} />
                    Attendees CSV
                  </a>
                  <Link
                    href="/admin/check-in"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-accent"
                  >
                    <DoorOpen size={12} />
                    Check-In
                  </Link>
                </div>
              </div>

              {/* Compact stat grid */}
              <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-5">
                {overviewStats.map((stat) => (
                  <div key={stat.label} className="p-4">
                    <div className="text-xl font-serif font-bold">{stat.value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── ORDERS ── */}
          <TabsContent value="orders">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Orders</span>
                <span className="text-xs text-muted-foreground">{orders.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Order</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Status</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Customer</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Tier / Voucher</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Qty</TableHead>
                      <TableHead className="h-9 px-4 text-right text-xs">Total</TableHead>
                      <TableHead className="h-9 w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="px-4 py-2.5 text-sm font-medium">{order.orderNumber}</TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Badge variant={statusVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <div className="text-sm font-medium leading-tight">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                          <div className="text-xs text-muted-foreground/60">
                            {order.ticketEmailLastSentAt
                              ? `Sent → ${order.ticketEmailLastSentTo || order.customerEmail}`
                              : "No email sent"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <div className="text-sm">
                            {order.source === "ADMIN_COMP"
                              ? "Complimentary"
                              : order.ticketTierNameSnapshot || "General"}
                          </div>
                          {order.voucherCodeSnapshot && (
                            <div className="font-mono text-xs text-muted-foreground">
                              {order.voucherCodeSnapshot}
                            </div>
                          )}
                          {order.internalLabel && (
                            <div className="text-xs text-muted-foreground">{order.internalLabel}</div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">{order.quantity}</TableCell>
                        <TableCell className="px-4 py-2.5 text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(order.totalPriceCents, order.currency)}
                          </div>
                          {order.discountAmountCents > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {`−${formatCurrency(order.discountAmountCents, order.currency)}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
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
                            canRefund={
                              order.source === "CHECKOUT" &&
                              order.status === "PAID" &&
                              order.totalPriceCents > 0
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── TICKETS ── */}
          <TabsContent value="tickets">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Tickets</span>
                <span className="text-xs text-muted-foreground">{tickets.length} issued</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Code</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Holder</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Order</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Status</TableHead>
                      <TableHead className="h-9 w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="px-4 py-2.5 font-mono text-xs">{ticket.ticketCode}</TableCell>
                        <TableCell className="px-4 py-2.5">
                          <div className="text-sm font-medium leading-tight">{ticket.holderName}</div>
                          <div className="text-xs text-muted-foreground">{ticket.holderEmail}</div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">{ticket.order.orderNumber}</TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Badge
                            variant={
                              ticket.order.status === "PAID"
                                ? ticket.checkedInAt
                                  ? "secondary"
                                  : "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {ticket.order.status === "PAID"
                              ? ticket.checkedInAt
                                ? "Checked In"
                                : "Issued"
                              : ticket.order.status}
                          </Badge>
                          {ticket.checkedInAt && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {ticket.checkedInAt.toLocaleString("en-CA", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 border-primary px-2 text-xs text-primary"
                          >
                            <Link href={`/tickets/code/${ticket.ticketCode}`}>
                              <Ticket size={12} className="mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── RSVPs ── */}
          <TabsContent value="rsvps">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">RSVPs</span>
                  <Badge variant="outline" className="text-xs">{`${summary.rsvpGoing} going`}</Badge>
                  <Badge variant="outline" className="text-xs">{`${summary.rsvpInterested} interested`}</Badge>
                  <Badge variant="outline" className="text-xs">{`${summary.rsvpCantGo} can't go`}</Badge>
                  <Badge variant="secondary" className="text-xs">{`${summary.rsvpEmailOptIns} email`}</Badge>
                  <Badge variant="secondary" className="text-xs">{`${summary.rsvpSmsOptIns} sms`}</Badge>
                </div>
                <a
                  href={`/api/admin/exports/rsvps?eventId=${encodeURIComponent(event.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Download size={12} />
                  Export CSV
                </a>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Status</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Contact</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Consent</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Source</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rsvps.length > 0 ? (
                      rsvps.map((rsvp) => (
                        <TableRow key={rsvp.id}>
                          <TableCell className="px-4 py-2.5">
                            <Badge
                              variant={
                                rsvp.status === "GOING"
                                  ? "default"
                                  : rsvp.status === "INTERESTED"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {rsvp.status === "CANT_GO" ? "CAN'T GO" : rsvp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2.5">
                            <div className="text-sm font-medium leading-tight">{rsvp.name || "Guest"}</div>
                            <div className="text-xs text-muted-foreground">{rsvp.email}</div>
                            {rsvp.phone && (
                              <div className="text-xs text-muted-foreground">{rsvp.phone}</div>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-2.5">
                            <div className="space-y-0.5 text-xs text-muted-foreground">
                              <div>{rsvp.emailOptIn ? "✓ Email" : "✗ Email"}</div>
                              <div>{rsvp.smsOptIn && rsvp.phone ? "✓ SMS" : "✗ SMS"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-xs capitalize text-muted-foreground">
                            {rsvp.source.replaceAll("_", " ").toLowerCase()}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rsvp.lastSubmittedAt.toLocaleString("en-CA", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No RSVP contacts captured yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── PROMOTIONS ── */}
          <TabsContent value="promotions" className="space-y-5">

            {/* Ticket tiers — compact table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Ticket Tiers</span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 border-primary px-2.5 text-xs text-primary"
                >
                  <Link href="/admin/events">Edit in Studio</Link>
                </Button>
              </div>
              {ticketTiers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Tier</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Price</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Sold</TableHead>
                      <TableHead className="h-9 px-4 text-right text-xs">Revenue</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketTiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="px-4 py-2.5 text-sm font-medium">{tier.name}</TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">
                          {formatCurrency(tier.priceCents, event.currency)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">{tier.soldCount}</TableCell>
                        <TableCell className="px-4 py-2.5 text-right text-sm font-medium">
                          {formatCurrency(tier.revenueCents, event.currency)}
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Badge variant={tier.isActive ? "secondary" : "outline"} className="text-xs">
                            {tier.isActive ? "Active" : "Off"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-5 py-5 text-sm text-muted-foreground">
                  Using base ticket price — no tiers configured.
                </p>
              )}
            </div>

            {/* Vouchers — compact table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Vouchers</span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 border-primary px-2.5 text-xs text-primary"
                >
                  <Link href="/admin/events">Generate in Studio</Link>
                </Button>
              </div>
              {vouchers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-4 text-xs">Code</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Discount</TableHead>
                      <TableHead className="h-9 px-4 text-xs">Used</TableHead>
                      <TableHead className="h-9 px-4 text-right text-xs">Discounted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="px-4 py-2.5 font-mono text-sm font-semibold">
                          {voucher.code}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">
                          {voucher.discountType === "FIXED"
                            ? `${formatCurrency(voucher.amountOffCents || 0, event.currency)} off`
                            : `${voucher.percentOff || 0}% off`}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm">
                          {`${voucher.redemptionCount}${voucher.maxRedemptions ? ` / ${voucher.maxRedemptions}` : ""}`}
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-right text-sm font-medium">
                          {formatCurrency(voucher.discountCents, event.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-5 py-5 text-sm text-muted-foreground">No vouchers created yet.</p>
              )}
            </div>

            {/* Discount code generator */}
            <Card className="border border-border shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Guest Discounts</div>
                  <h2 className="mt-1 text-lg font-serif font-bold">Generate unique per-guest codes</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paste guest emails or an orders CSV — one assigned code per guest.
                  </p>
                </div>
                <AdminDiscountCodeGenerator eventId={event.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EMAIL ── */}
          <TabsContent value="email" className="space-y-5">
            <Card className="border border-border shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Ticket Delivery
                  </div>
                  <h2 className="mt-1 text-lg font-serif font-bold">Mass-send ticket packs</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Send unsent ticket emails before the event, or resend every paid order.
                  </p>
                </div>
                <AdminEventEmailActions eventId={event.id} emailEnabled={!ticketDeliveryIssue} />
              </CardContent>
            </Card>

            <AdminEventEmailCampaignComposer
              event={{
                id: event.id,
                title: event.title,
                startsAt: event.startsAt?.toISOString() || null,
                venue: event.venue,
                address: event.address,
                checkoutEnabled: event.checkoutEnabled,
                currency: event.currency,
                rsvpContactCount: summary.rsvpEmailOptIns,
              }}
              audienceEvents={audienceEvents.map((ae) => ({
                id: ae.id,
                title: ae.title,
                startsAt: ae.startsAt?.toISOString() || null,
                venue: ae.venue,
                address: ae.address,
                paidOrders: ae.paidOrders,
                ticketsIssued: ae.ticketsIssued,
                uniqueRecipients: ae.uniqueRecipients,
                rsvpContacts: ae.rsvpContacts,
                revenueCents: ae.revenueCents,
              }))}
              campaignHistory={emailCampaignHistory}
            />
          </TabsContent>

          {/* ── MARKETING ── */}
          <TabsContent value="marketing">
            <AdminEventMarketingKit
              event={{
                id: event.id,
                title: event.title,
                startsAt: event.startsAt?.toISOString() || null,
                venue: event.venue,
                address: event.address,
                image: event.image,
                previewDescription: event.previewDescription,
                description: event.description,
                checkoutEnabled: event.checkoutEnabled,
                ticketPriceCents: event.ticketPriceCents,
                currency: event.currency,
              }}
            />
          </TabsContent>

          {/* ── GUEST LIST ── */}
          <TabsContent value="guest-list">
            <AdminCompOrderForm
              events={[{ id: event.id, title: event.title, dateLabel }]}
              ticketEmailConfigured={!ticketDeliveryIssue}
            />
          </TabsContent>

          {/* ── EDIT EVENT ── */}
          <TabsContent value="settings">
            {managedEvent ? (
              <EventEditorCard initialEvent={managedEvent} mode="edit" />
            ) : (
              <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground shadow-sm">
                Event settings could not be loaded.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
