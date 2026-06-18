import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { subscribeRealtime } from "@/lib/realtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const encoder = new TextEncoder()

export async function GET() {
  const authenticated = await isAdminAuthenticated().catch(() => false)
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"))

      unsubscribe = subscribeRealtime((event) => {
        controller.enqueue(
          encoder.encode(`event: update\ndata: ${JSON.stringify(event)}\n\n`),
        )
      })

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"))
      }, 25_000)
    },
    cancel() {
      unsubscribe?.()
      if (keepAlive) clearInterval(keepAlive)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
