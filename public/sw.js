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
  const link = payload.link || "/admin/notifications"

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
      },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.link || "/admin/notifications", self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            if ("navigate" in client) {
              return client.navigate(targetUrl).then(() => client.focus())
            }
            return client.focus()
          }
        }

        return self.clients.openWindow(targetUrl)
      }),
  )
})
