import "server-only"

export type RealtimeEvent = {
  type: string
  eventId?: string | null
  entityType?: string | null
  entityId?: string | null
  action?: string | null
  actorEmail?: string | null
  recipientEmail?: string | null
  title?: string | null
  body?: string | null
  link?: string | null
  createdAt: string
}

type RealtimeSubscriber = {
  id: string
  send: (event: RealtimeEvent) => void
}

const globalForRealtime = globalThis as typeof globalThis & {
  teezRealtimeSubscribers?: Set<RealtimeSubscriber>
}

function getSubscribers() {
  if (!globalForRealtime.teezRealtimeSubscribers) {
    globalForRealtime.teezRealtimeSubscribers = new Set()
  }

  return globalForRealtime.teezRealtimeSubscribers
}

export function subscribeRealtime(send: (event: RealtimeEvent) => void) {
  const subscriber: RealtimeSubscriber = {
    id: crypto.randomUUID(),
    send,
  }

  getSubscribers().add(subscriber)

  return () => {
    getSubscribers().delete(subscriber)
  }
}

export function publishRealtimeEvent(event: Omit<RealtimeEvent, "createdAt"> & { createdAt?: string }) {
  const payload: RealtimeEvent = {
    ...event,
    createdAt: event.createdAt ?? new Date().toISOString(),
  }

  for (const subscriber of getSubscribers()) {
    try {
      subscriber.send(payload)
    } catch {
      getSubscribers().delete(subscriber)
    }
  }
}
