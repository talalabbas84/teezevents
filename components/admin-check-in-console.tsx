"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, CheckCircle2, Loader2, Search, ShieldAlert, Ticket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type EventOption = {
  id: string
  title: string
  dateLabel: string
  ticketsIssued: number
  checkedInCount: number
}

type RecentCheckIn = {
  ticketCode: string
  eventTitle: string
  holderEmail: string
  checkedInAt: string
  orderNumber: string
}

type CheckInResponse = {
  ok: boolean
  alreadyCheckedIn: boolean
  message: string
  ticket: {
    ticketCode: string
    status: string
    checkedInAt: string | null
    holderName: string
    holderEmail: string
    ticketIndex: number
    totalTickets: number
    eventId: string
    eventTitle: string
    eventDate: string | null
    orderNumber: string
    ticketHref: string
    walletHref: string | null
  }
}

type BarcodeDetectorShape = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>
}

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorShape

export function AdminCheckInConsole({
  events,
  recentCheckIns,
}: {
  events: EventOption[]
  recentCheckIns: RecentCheckIn[]
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorShape | null>(null)
  const scanTimeoutRef = useRef<number | null>(null)
  const lastScannedRef = useRef<{ value: string; at: number }>({ value: "", at: 0 })

  const [selectedEventId, setSelectedEventId] = useState("")
  const [manualCode, setManualCode] = useState("")
  const [scannerSupported, setScannerSupported] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<CheckInResponse | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const barcodeWindow = window as Window & {
      BarcodeDetector?: BarcodeDetectorConstructor
    }

    if (!barcodeWindow.BarcodeDetector) {
      return
    }

    detectorRef.current = new barcodeWindow.BarcodeDetector({
      formats: ["qr_code"],
    })
    setScannerSupported(true)

    return () => {
      if (scanTimeoutRef.current) {
        window.clearTimeout(scanTimeoutRef.current)
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!cameraActive || !detectorRef.current || !videoRef.current) {
      return
    }

    let cancelled = false

    const loop = async () => {
      if (cancelled || !videoRef.current || !detectorRef.current) {
        return
      }

      try {
        const codes = await detectorRef.current.detect(videoRef.current)
        const rawValue = codes.find((code) => Boolean(code.rawValue))?.rawValue

        if (rawValue && !isSubmitting) {
          const now = Date.now()
          const shouldProcess =
            rawValue !== lastScannedRef.current.value || now - lastScannedRef.current.at > 3000

          if (shouldProcess) {
            lastScannedRef.current = { value: rawValue, at: now }
            await submitTicket(rawValue, "checkin")
          }
        }
      } catch {
        // Ignore transient detector errors while the stream is live.
      }

      if (!cancelled) {
        scanTimeoutRef.current = window.setTimeout(loop, 450)
      }
    }

    scanTimeoutRef.current = window.setTimeout(loop, 450)

    return () => {
      cancelled = true

      if (scanTimeoutRef.current) {
        window.clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [cameraActive, isSubmitting])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setError("Camera access is not available in this browser.")
      return
    }

    setError("")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      })

      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => null)
      setCameraActive(true)
    } catch {
      setError("Unable to access the camera. Use manual ticket entry instead.")
    }
  }

  function stopCamera() {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  async function submitTicket(ticketCode: string, mode: "lookup" | "checkin") {
    setError("")
    setIsSubmitting(true)

    const response = await fetch("/api/admin/check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticketCode,
        mode,
        eventId: selectedEventId || undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSubmitting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = (await response.json().catch(() => null)) as CheckInResponse | { error?: string } | null

    if (!response.ok || !payload || !("ok" in payload)) {
      setIsSubmitting(false)
      setResult(null)
      setError((payload as { error?: string } | null)?.error || "Unable to process ticket.")
      return
    }

    setResult(payload)
    setManualCode("")
    setIsSubmitting(false)

    if (mode === "checkin") {
      stopCamera()
    }
  }

  const activeEvent = events.find((event) => event.id === selectedEventId) || null

  return (
    <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-6 p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Scanner</div>
                <h2 className="mt-2 text-3xl font-serif font-bold">Door Check-In Console</h2>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Scan a QR ticket at the door or enter the code manually. The console verifies the ticket and records
                  check-in against the live event data.
                </p>
              </div>
              <Badge variant={cameraActive ? "default" : "outline"}>
                {cameraActive ? "Camera Live" : scannerSupported ? "Scanner Ready" : "Manual Mode"}
              </Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-2">
                <Label htmlFor="check-in-event">Event Filter</Label>
                <select
                  id="check-in-event"
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All events</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {`${event.title} • ${event.dateLabel}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl border border-primary/15 bg-primary/10 p-4 text-sm text-muted-foreground">
                {activeEvent ? (
                  <>
                    <div className="font-semibold text-primary">{activeEvent.title}</div>
                    <div className="mt-2">{`${activeEvent.checkedInCount}/${activeEvent.ticketsIssued} checked in`}</div>
                  </>
                ) : (
                  "Leave the filter on All events to accept any valid TEEZ ticket. Set an event filter to reject tickets from other nights."
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-border bg-[#201A17]">
              <div className="aspect-[4/3] w-full">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-white">
                <div className="text-sm text-white/70">
                  {cameraActive
                    ? "Point the camera at a QR ticket. Scans are processed automatically."
                    : scannerSupported
                      ? "Start the camera to scan QR tickets live."
                      : "This browser does not support in-page QR scanning. Use manual code entry below."}
                </div>
                <div className="flex flex-wrap gap-3">
                  {cameraActive ? (
                    <Button type="button" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={stopCamera}>
                      <span className="inline-flex items-center gap-2">
                        <CameraOff size={16} />
                        Stop Camera
                      </span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="bg-primary text-primary-foreground hover:bg-accent"
                      onClick={startCamera}
                      disabled={!scannerSupported}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Camera size={16} />
                        Start Camera
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <form
              className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                void submitTicket(manualCode, "checkin")
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="manual-ticket-code">Manual Ticket Code</Label>
                <Input
                  id="manual-ticket-code"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="Paste a ticket code or full ticket URL"
                  disabled={isSubmitting}
                />
              </div>

              <div className="self-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-2 border-primary text-primary"
                  disabled={isSubmitting || !manualCode.trim()}
                  onClick={() => void submitTicket(manualCode, "lookup")}
                >
                  <span className="inline-flex items-center gap-2">
                    <Search size={16} />
                    Lookup
                  </span>
                </Button>
              </div>

              <div className="self-end">
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-accent"
                  disabled={isSubmitting || !manualCode.trim()}
                >
                  <span className="inline-flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Check In
                  </span>
                </Button>
              </div>
            </form>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-5 p-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Latest Result</div>
              <h2 className="mt-2 text-2xl font-serif font-bold">Ticket Verification</h2>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Status</div>
                      <div className="mt-2 text-lg font-semibold">{result.message}</div>
                    </div>
                    <Badge variant={result.alreadyCheckedIn ? "secondary" : "default"}>
                      {result.alreadyCheckedIn ? "Already Checked In" : "Accepted"}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                  <div>{`Event: ${result.ticket.eventTitle}`}</div>
                  <div>{`Order: ${result.ticket.orderNumber}`}</div>
                  <div>{`Holder: ${result.ticket.holderName} • ${result.ticket.holderEmail}`}</div>
                  <div>{`Ticket: ${result.ticket.ticketIndex} of ${result.ticket.totalTickets}`}</div>
                  <div>{`Code: ${result.ticket.ticketCode}`}</div>
                  {result.ticket.checkedInAt && (
                    <div>{`Checked in at: ${new Date(result.ticket.checkedInAt).toLocaleString("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                    <Link href={result.ticket.ticketHref}>Open Ticket</Link>
                  </Button>
                  {result.ticket.walletHref && (
                    <Button asChild variant="outline" className="border-2 border-primary text-primary">
                      <Link href={result.ticket.walletHref}>Open Wallet</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                Scan or enter a ticket to see the live verification result here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <Ticket className="text-primary" />
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Door Activity</div>
                <h2 className="text-2xl font-serif font-bold">Recent Check-Ins</h2>
              </div>
            </div>

            {recentCheckIns.length > 0 ? (
              <div className="space-y-3">
                {recentCheckIns.map((entry) => (
                  <div key={`${entry.ticketCode}-${entry.checkedInAt}`} className="rounded-3xl border border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{entry.eventTitle}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{entry.holderEmail}</div>
                        <div className="mt-2 font-mono text-xs text-muted-foreground">{entry.ticketCode}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{entry.orderNumber}</div>
                        <div className="mt-1">
                          {new Date(entry.checkedInAt).toLocaleString("en-CA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <ShieldAlert size={16} />
                  No tickets have been checked in yet.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
