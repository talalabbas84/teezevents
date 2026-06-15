export type EventCategory = "Past Event" | "Upcoming Event"

export type EventType = "themed" | "signature" | "corporate" | "social"

export type EventSection = {
  title: string
  body: string[]
}

export type EventGuestStats = {
  mutuals: number
  going: number
  interested: number
}

export type EventTimelineItem = {
  time: string
  title: string
  description: string
}

export type EventPerk = {
  title: string
  description: string
}

export type EventFaq = {
  question: string
  answer: string
}

export type EventPolicy = {
  title: string
  body: string
}

export type EventData = {
  id: string
  title: string
  date: string
  shortDate: string
  startsAtIso?: string
  time?: string
  venue?: string
  location: string
  address?: string
  hostedBy?: string
  attendees: string
  image: string
  previewDescription: string
  description: string
  category: EventCategory
  type: EventType
  highlights: string[]
  gallery: string[]
  videoUrl: string | null
  ticketsUrl?: string
  ticketPrice?: string
  ticketPriceCents?: number
  currency?: string
  maxTicketsPerOrder?: number
  checkoutEnabled?: boolean
  ticketNote?: string
  spotsLeft?: number
  capacity?: number
  sections?: EventSection[]
  guestStats?: EventGuestStats
  timeline?: EventTimelineItem[]
  perks?: EventPerk[]
  faqs?: EventFaq[]
  policies?: EventPolicy[]
  shareText?: string
  kindNote?: string
  featured?: boolean
}

export const roaring20sGallery = [
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904276/teez-events/roaring20s/Punta_Cana-134_besxou.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904250/teez-events/roaring20s/Punta_Cana-141_et0ytt.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904235/teez-events/roaring20s/ef631d7b-c34e-4b00-b684-250446fa2989_za3nqm.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904205/teez-events/roaring20s/IMG_6697_ycsqkl.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904183/teez-events/roaring20s/Punta_Cana-096_kqlpeu.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904164/teez-events/roaring20s/Punta_Cana-099_ylcm72.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904126/teez-events/roaring20s/Punta_Cana-111_yscjjx.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904076/teez-events/roaring20s/Roaring_20s-048_ofweob.jpg",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904061/teez-events/roaring20s/Roaring_20s-043_cudnkz.jpg",
]

export const halloweenGallery = [
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904526/teez-events/HAlloween/fa265eb2-2191-4aa1-857a-ec49a564a46f.png",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904514/teez-events/HAlloween/3e640abc-87bd-4065-91a6-0f808ba92c2c.png",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904502/teez-events/HAlloween/ecb3e066-25d9-4bba-b8f2-fff5303b53b7.png",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904489/teez-events/HAlloween/c135d9f7-fdb1-4059-a679-d06da8dde316.png",
  "https://res.cloudinary.com/ddue2t3ue/image/upload/v1777904327/teez-events/HAlloween/Canon_20251101_19513532_fhjgug.jpg",
]

export function supportsCheckout(event: EventData) {
  return Boolean(event.checkoutEnabled && event.ticketPriceCents && event.currency)
}

export function getEventCheckoutPath(eventId: string) {
  return `/checkout/${eventId}`
}

export function getEventPrimaryTicketHref(event: EventData) {
  if (supportsCheckout(event)) {
    return getEventCheckoutPath(event.id)
  }

  return event.ticketsUrl || `/events/${event.id}`
}

export function getEventPrimaryTicketLabel(event: EventData) {
  return supportsCheckout(event) ? "Buy Tickets" : "Reserve Tickets"
}
