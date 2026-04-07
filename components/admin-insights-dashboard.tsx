"use client"

import { Activity, BarChart3, TrendingUp, Wallet } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type SummaryProps = {
  sellThroughRate: number
  checkInRate: number
  averageOrderValueCents: number
  remainingCapacity: number
  compOrders: number
  pendingTickets: number
  ticketDeliveryRate: number
  discountAmountCents: number
}

type EventPerformancePoint = {
  title: string
  ticketsIssued: number
  checkedInCount: number
  remainingCapacity: number
  revenueCents: number
}

type SalesPoint = {
  label: string
  orders: number
  tickets: number
  revenueCents: number
}

type CheckInPoint = {
  label: string
  checkedInCount: number
}

type TierPerformanceSummary = {
  label: string
  tickets: number
  revenueCents: number
}

type VoucherUsageSummary = {
  code: string
  orders: number
  discountAmountCents: number
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatCompactCurrency(amountInCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amountInCents / 100)
}

export function AdminInsightsDashboard({
  summary,
  events,
  salesTimeline,
  checkInTimeline,
  topTicketTiers,
  voucherUsage,
}: {
  summary: SummaryProps
  events: EventPerformancePoint[]
  salesTimeline: SalesPoint[]
  checkInTimeline: CheckInPoint[]
  topTicketTiers: TierPerformanceSummary[]
  voucherUsage: VoucherUsageSummary[]
}) {
  const hasSalesData = salesTimeline.length > 0
  const hasEventData = events.length > 0
  const hasCheckInData = checkInTimeline.length > 0

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TrendingUp size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Sell Through</div>
            <div className="text-3xl font-serif font-bold">{formatPercent(summary.sellThroughRate)}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Check-In Rate</div>
            <div className="text-3xl font-serif font-bold">{formatPercent(summary.checkInRate)}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Average Order</div>
            <div className="text-3xl font-serif font-bold">{formatCurrency(summary.averageOrderValueCents)}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Remaining Capacity</div>
            <div className="text-3xl font-serif font-bold">{summary.remainingCapacity}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Complimentary Orders</div>
            <div className="text-3xl font-serif font-bold">{summary.compOrders}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pending Holds</div>
            <div className="text-3xl font-serif font-bold">{summary.pendingTickets}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Ticket Delivery</div>
            <div className="text-3xl font-serif font-bold">{formatPercent(summary.ticketDeliveryRate)}</div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet size={20} />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Discount Given</div>
            <div className="text-3xl font-serif font-bold">{formatCurrency(summary.discountAmountCents)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Revenue Timeline</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Orders and sales activity</h2>
            </div>

            {hasSalesData ? (
              <ChartContainer
                config={{
                  revenueCents: {
                    label: "Revenue",
                    color: "#C57A3A",
                  },
                  tickets: {
                    label: "Tickets",
                    color: "#2E6B5B",
                  },
                }}
                className="h-[320px] w-full"
              >
                <AreaChart data={salesTimeline}>
                  <defs>
                    <linearGradient id="salesRevenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenueCents)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--color-revenueCents)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value: number) => formatCompactCurrency(value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === "Revenue" || name === "revenueCents") {
                            return formatCurrency(Number(value))
                          }

                          return Number(value).toLocaleString("en-CA")
                        }}
                      />
                    }
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenueCents"
                    stroke="var(--color-revenueCents)"
                    fill="url(#salesRevenueFill)"
                    strokeWidth={2.5}
                  />
                  <Bar yAxisId="right" dataKey="tickets" fill="var(--color-tickets)" radius={[8, 8, 0, 0]} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
                Paid orders will appear here once checkout activity starts.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Door Progress</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Issued versus checked in</h2>
            </div>

            {hasEventData ? (
              <ChartContainer
                config={{
                  ticketsIssued: {
                    label: "Issued",
                    color: "#C57A3A",
                  },
                  checkedInCount: {
                    label: "Checked In",
                    color: "#2E6B5B",
                  },
                }}
                className="h-[320px] w-full"
              >
                <BarChart data={events}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="title" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={56} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ticketsIssued" fill="var(--color-ticketsIssued)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="checkedInCount" fill="var(--color-checkedInCount)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
                Issued tickets will appear here after the first successful purchase.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Check-In Timeline</div>
            <h2 className="mt-2 text-2xl font-serif font-bold">Door traffic over time</h2>
          </div>

          {hasCheckInData ? (
            <ChartContainer
              config={{
                checkedInCount: {
                  label: "Check-Ins",
                  color: "#2E6B5B",
                },
              }}
              className="h-[280px] w-full"
            >
              <BarChart data={checkInTimeline}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="checkedInCount" fill="var(--color-checkedInCount)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
              Check-ins will start plotting here as tickets are scanned at the event.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-2">
        <Card className="border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Tier Performance</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Best-selling ticket buckets</h2>
            </div>

            {topTicketTiers.length > 0 ? (
              <div className="space-y-3">
                {topTicketTiers.map((tier) => (
                  <div key={tier.label} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <div>
                      <div className="font-medium">{tier.label}</div>
                      <div className="text-sm text-muted-foreground">{`${tier.tickets} tickets`}</div>
                    </div>
                    <div className="font-semibold">{formatCurrency(tier.revenueCents)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
                Ticket tiers and labels will appear here after sales start.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Voucher Usage</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Promo code impact</h2>
            </div>

            {voucherUsage.length > 0 ? (
              <div className="space-y-3">
                {voucherUsage.map((voucher) => (
                  <div key={voucher.code} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                    <div>
                      <div className="font-medium">{voucher.code}</div>
                      <div className="text-sm text-muted-foreground">{`${voucher.orders} orders`}</div>
                    </div>
                    <div className="font-semibold">{formatCurrency(voucher.discountAmountCents)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
                Voucher redemption will show up here once promo codes are used.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
