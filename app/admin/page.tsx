import Link from "next/link"
import { CalendarDays, DoorOpen, Download, LogOut, ReceiptText, Settings2, Ticket, Wallet } from "lucide-react"

import { AdminCompOrderForm } from "@/components/admin-comp-order-form"
import { AdminInsightsDashboard } from "@/components/admin-insights-dashboard"
import { AdminOrderActions } from "@/components/admin-order-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getAdminDashboardData, getCheckoutSetupIssue } from "@/lib/checkout"
import { requireAdminSession } from "@/lib/admin-auth"
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

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const ticketDeliveryIssue = getTicketDeliverySetupIssue()
  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null
  let setupIssue: ReturnType<typeof getCheckoutSetupIssue> | null = null

  try {
    dashboard = await getAdminDashboardData()
  } catch (error) {
    setupIssue = getCheckoutSetupIssue(error)
  }

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">TEEZ Admin</div>
            <h1 className="mt-2 text-5xl font-serif font-bold text-balance">Live Event Operations</h1>
            <p className="mt-3 text-lg text-muted-foreground">{`Signed in as ${session.email}`}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <Link href="/admin/events">
                <span className="inline-flex items-center gap-2">
                  <Settings2 size={16} />
                  Manage Events
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <a href="/api/admin/exports/tickets">
                <span className="inline-flex items-center gap-2">
                  <Download size={16} />
                  Export Attendees
                </span>
              </a>
            </Button>
            <Button asChild variant="outline" className="border-2 border-primary text-primary">
              <a href="/api/admin/exports/orders">
                <span className="inline-flex items-center gap-2">
                  <Download size={16} />
                  Export Orders
                </span>
              </a>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/check-in">
                <span className="inline-flex items-center gap-2">
                  <DoorOpen size={16} />
                  Check-In Console
                </span>
              </Link>
            </Button>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline" className="border-2 border-primary text-primary">
                <span className="inline-flex items-center gap-2">
                  <LogOut size={16} />
                  Sign Out
                </span>
              </Button>
            </form>
          </div>
        </div>

        {setupIssue || !dashboard ? (
          <Card className="border border-border shadow-xl">
            <CardContent className="space-y-4 p-8">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Dashboard Setup</div>
              <h2 className="text-3xl font-serif font-bold">{setupIssue?.title || "Dashboard unavailable"}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {setupIssue?.description || "The admin dashboard could not connect to the live event data."}
              </p>
              {setupIssue?.action && <p className="text-sm text-muted-foreground">{setupIssue.action}</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <AdminCompOrderForm
                events={dashboard.events.map((event) => ({
                  id: event.id,
                  title: event.title,
                  dateLabel: formatEventDate(event.startsAt),
                }))}
                ticketEmailConfigured={!ticketDeliveryIssue}
              />

              <Card className="border border-border shadow-xl">
                <CardContent className="space-y-5 p-6 lg:p-8">
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Ticket Delivery</div>
                  <h2 className="text-2xl font-serif font-bold">Email and download workflow</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Complimentary orders issue live QR tickets immediately. Every paid or comp order can be downloaded as
                    a printable ticket pack, and emailed directly from the orders table below.
                  </p>
                  <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 text-sm text-muted-foreground">
                    {ticketDeliveryIssue ? (
                      <>
                        <div className="font-semibold text-foreground">SMTP setup required</div>
                        <div className="mt-2">{ticketDeliveryIssue}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-foreground">Ticket email delivery is live</div>
                        <div className="mt-2">
                          Paid checkouts can auto-send tickets after payment confirmation, and admins can resend them to
                          any address from the dashboard.
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ReceiptText size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Completed Orders</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.paidOrders}</div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Ticket size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tickets Issued</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.ticketsIssued}</div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <DoorOpen size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Checked In</div>
                  <div className="text-3xl font-serif font-bold">{dashboard.summary.checkedInCount}</div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-lg">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Wallet size={20} />
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Gross Revenue</div>
                  <div className="text-3xl font-serif font-bold">
                    {formatCurrency(dashboard.summary.grossRevenueCents, "cad")}
                  </div>
                </CardContent>
              </Card>
            </div>

            <AdminInsightsDashboard
              summary={{
                sellThroughRate: dashboard.summary.sellThroughRate,
                checkInRate: dashboard.summary.checkInRate,
                averageOrderValueCents: dashboard.summary.averageOrderValueCents,
                remainingCapacity: dashboard.summary.remainingCapacity,
                compOrders: dashboard.summary.compOrders,
                pendingTickets: dashboard.summary.pendingTickets,
                ticketDeliveryRate: dashboard.summary.ticketDeliveryRate,
                discountAmountCents: dashboard.summary.discountAmountCents,
              }}
              events={dashboard.events.map((event) => ({
                title: event.title,
                ticketsIssued: event.ticketsIssued,
                checkedInCount: event.checkedInCount,
                remainingCapacity: event.remainingCapacity,
                revenueCents: event.revenueCents,
              }))}
              salesTimeline={dashboard.salesTimeline.map((point) => ({
                label: point.label,
                orders: point.orders || 0,
                tickets: point.tickets || 0,
                revenueCents: point.revenueCents || 0,
              }))}
              checkInTimeline={dashboard.checkInTimeline.map((point) => ({
                label: point.label,
                checkedInCount: point.checkedInCount || 0,
              }))}
              topTicketTiers={dashboard.topTicketTiers}
              voucherUsage={dashboard.voucherUsage}
            />

            <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border border-border shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <CalendarDays className="text-primary" />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Events</div>
                      <h2 className="text-2xl font-serif font-bold">Capacity Overview</h2>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {dashboard.events.map((event) => (
                      <div key={event.id} className="rounded-3xl border border-border bg-muted/30 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-serif font-bold">{event.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.startsAt)}</p>
                          </div>
                          <Badge variant="outline">{`${event.remainingCapacity} spots left`}</Badge>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                          <div>{`${event.paidOrders} completed orders`}</div>
                          <div>{`${event.ticketsIssued} tickets issued`}</div>
                          <div>{`${event.checkedInCount} checked in`}</div>
                          <div>{formatCurrency(event.revenueCents, "cad")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <ReceiptText className="text-primary" />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Orders</div>
                      <h2 className="text-2xl font-serif font-bold">Recent Ticket Orders</h2>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Tickets</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.eventTitleSnapshot}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={order.source === "ADMIN_COMP" ? "secondary" : "outline"}>
                                {order.source === "ADMIN_COMP" ? "Complimentary" : "Checkout"}
                              </Badge>
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
                              <span>{order.customerEmail}</span>
                              {order.ticketEmailLastSentAt ? (
                                <span className="text-xs text-muted-foreground">{`Tickets sent to ${order.ticketEmailLastSentTo || order.customerEmail}`}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No ticket email sent yet</span>
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
                              emailEnabled={!ticketDeliveryIssue}
                              customerName={order.customerName}
                              customerPhone={order.customerPhone}
                              notes={order.notes}
                              internalLabel={order.internalLabel}
                              quantity={order.quantity}
                              source={order.source}
                              ticketTierName={order.ticketTierNameSnapshot}
                              voucherCode={order.voucherCodeSnapshot}
                              totalLabel={formatCurrency(order.totalPriceCents, order.currency)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border shadow-xl">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <Ticket className="text-primary" />
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tickets</div>
                    <h2 className="text-2xl font-serif font-bold">Issued Ticket Feed</h2>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Code</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.ticketCode}</TableCell>
                        <TableCell>{ticket.order.eventTitleSnapshot}</TableCell>
                        <TableCell>{ticket.holderEmail}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.checkedInAt ? "secondary" : "default"}>
                            {ticket.checkedInAt ? "Checked In" : "Issued"}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.order.orderNumber}</TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="outline" className="border-primary text-primary">
                            <Link href={`/tickets/code/${ticket.ticketCode}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
