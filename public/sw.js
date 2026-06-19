self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || "TEEZ notification"
  // Deep link: use explicit link from payload, fallback to type-based route
  const link = payload.link || resolveDeepLink(payload)

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/apple-icon.png",
      badge: "/icon-light-32x32.png",
      tag: payload.notificationId || payload.type || "teez-notification",
      renotify: Boolean(payload.notificationId),
      data: {
        link,
        notificationId: payload.notificationId,
        type: payload.type,
        eventId: payload.eventId,
        entityType: payload.entityType,
        entityId: payload.entityId,
      },
    }),
  )
})

/**
 * Resolve the best deep link from notification metadata.
 * Notification payloads include: type, eventId, entityType, entityId.
 */
function resolveDeepLink(payload) {
  const { type, eventId, entityType, entityId } = payload || {}

  if (!type) return "/admin/notifications"

  // Task-related → planning tasks board
  if (["TASK_ASSIGNED", "TASK_DUE_SOON", "TASK_OVERDUE", "TASK_COMPLETED"].includes(type)) {
    if (eventId) return `/admin/planning/${eventId}/tasks`
    return "/admin/planning"
  }

  // Comment mentions → collaboration tab
  if (type === "COMMENT_MENTION") {
    if (eventId) return `/admin/planning/${eventId}/collaboration`
    return "/admin/notifications"
  }

  // Budget → budget page
  if (type === "BUDGET_ALERT") {
    if (eventId) return `/admin/planning/${eventId}/budget`
    return "/admin/planning"
  }

  // Vendor → vendors page
  if (type === "VENDOR_STATUS_CHANGED") {
    if (eventId) return `/admin/planning/${eventId}/vendors`
    return "/admin/planning"
  }

  // Risk → risks page
  if (type === "RISK_ESCALATED") {
    if (eventId) return `/admin/planning/${eventId}/risks`
    return "/admin/planning"
  }

  // Checklist → checklists
  if (type === "CHECKLIST_ITEM_DONE") {
    if (eventId) return `/admin/planning/${eventId}/checklists`
    return "/admin/planning"
  }

  // Blueprint, file → dashboard
  if (["BLUEPRINT_APPLIED", "FILE_UPLOADED"].includes(type)) {
    if (eventId) return `/admin/planning/${eventId}/dashboard`
    return "/admin/planning"
  }

  // Event status change → planning dashboard
  if (type === "EVENT_STATUS_CHANGED") {
    if (eventId) return `/admin/planning/${eventId}/dashboard`
    return "/admin/planning"
  }

  // Automation → automations page
  if (type === "AUTOMATION_TRIGGERED") {
    return "/admin/automations"
  }

  return "/admin/notifications"
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = new URL(
    event.notification.data?.link || "/admin/notifications",
    self.location.origin,
  ).href

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If a tab is already open at the same origin, navigate it
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin)) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then(() => client.focus())
            }
            return client.focus()
          }
        }
        // No open tab — open a new window
        return self.clients.openWindow(targetUrl)
      }),
  )
})
