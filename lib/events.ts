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
  kindNote?: string
  featured?: boolean
}

const events: EventData[] = [
  {
    id: "blossom",
    title: "BLOSSOM",
    date: "Saturday, April 25, 2026",
    shortDate: "Saturday, Apr 25, 2026",
    startsAtIso: "2026-04-25T18:00:00-04:00",
    time: "6:00 PM",
    venue: "",
    location: "Downtown Toronto",
    address: "Downtown Toronto",
    hostedBy: "TEEZ",
    attendees: "80",
    image: "/vibrant-dance-party-with-colorful-lights.jpg",
    previewDescription:
      "An invite-only spring social with warm energy, soft spring tones, finger foods, and a limited guest list.",
    description:
      "We’re welcoming the new season the best way we know how, with good music, warm energy, and our favorite people. This gathering is a little more personal. It’s our way of saying thank you to those who’ve been part of the TEEZ journey. Your presence, your support, and your energy have truly shaped what these nights have become, and we’re excited to share this next chapter with you.",
    category: "Upcoming Event",
    type: "social",
    highlights: [
      "Invite-only spring social with a limited guest list",
      "Relaxed but elevated dance night with familiar faces and new connections",
      "Pastels and soft spring tones dress code",
      "Finger foods included throughout the evening",
      "BYOB with no bar service onsite",
      "Secure card checkout powered by Stripe",
    ],
    gallery: [
      "/vibrant-dance-party-with-colorful-lights.jpg",
      "/food-catering-display.jpg",
      "/summer-cocktails-tropical-drinks.jpg",
      "/outdoor-pavilion-evening-lights.jpg",
      "/live-salsa-band-outdoor-stage.jpg",
      "/images/image.png",
    ],
    videoUrl: null,
    ticketsUrl: "/contact?event=blossom&intent=rsvp",
    ticketPrice: "$22",
    ticketPriceCents: 2200,
    currency: "cad",
    maxTicketsPerOrder: 80,
    checkoutEnabled: true,
    ticketNote:
      "Invite-only and limited capacity. Card payments are processed in secure Stripe checkout, and exact venue details are shared after payment or RSVP confirmation.",
    spotsLeft: 75,
    capacity: 80,
    sections: [
      {
        title: "What to Expect",
        body: [
          "A relaxed but elevated social dance night, familiar faces, new connections, and a space where you can just show up, feel good, and enjoy the moment.",
        ],
      },
      {
        title: "Dress Code",
        body: [
          "Pastels and soft spring tones.",
          "Fresh, effortless, and you, with a semi-casual look and a polished touch.",
        ],
      },
      {
        title: "Food & Drinks",
        body: [
          "A selection of finger foods will be available throughout the evening.",
          "Drinks are BYOB and there is no bar service onsite.",
        ],
      },
      {
        title: "Ticketing",
        body: [
          "$22 per guest.",
          "Use the checkout page to pay by card, or contact TEEZ if you need a manual RSVP. Exact venue details are shared after confirmation.",
        ],
      },
    ],
    guestStats: {
      mutuals: 4,
      going: 5,
      interested: 1,
    },
    kindNote:
      "By attending, you agree to be photographed and filmed for TEEZ marketing and promotional materials. Please be mindful with alcohol consumption. There’s no space for tenting or extended setup, and we encourage planning a safe ride home. To keep the atmosphere enjoyable for everyone, we ask all guests to help maintain a respectful, positive vibe throughout the night.",
    featured: true,
  },
  {
    id: "summer-salsa",
    title: "Summer Salsa Night",
    date: "June 2026",
    shortDate: "Coming June 2026",
    location: "Outdoor Pavilion",
    attendees: "400+",
    image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
    previewDescription: "Dance under the stars with live salsa band and chef-crafted cuisine.",
    description:
      "Get ready for an enchanting evening under the stars. Our Summer Salsa Night will feature a live salsa band, professional dance instructors, and chef-crafted cuisine. Whether you're a seasoned dancer or a beginner, this event promises an unforgettable experience filled with rhythm, flavor, and warm summer vibes.",
    category: "Upcoming Event",
    type: "signature",
    highlights: [
      "Live salsa band performance",
      "Professional salsa dance lessons",
      "Chef-curated food stations",
      "Open-air dance floor under the stars",
      "Tropical cocktails and refreshments",
    ],
    gallery: [
      "/outdoor-salsa-dancing-party-summer-evening.jpg",
      "/live-salsa-band-outdoor-stage.jpg",
      "/food-catering-display.jpg",
      "/couples-dancing-salsa-outdoors.jpg",
      "/summer-cocktails-tropical-drinks.jpg",
      "/outdoor-pavilion-evening-lights.jpg",
    ],
    videoUrl: null,
    ticketsUrl: "/contact?event=summer-salsa&intent=tickets",
    featured: true,
  },
  {
    id: "halloween-2024",
    title: "Halloween Fiesta",
    date: "October 31, 2024",
    shortDate: "October 31, 2024",
    location: "Downtown Event Center",
    attendees: "500+",
    image: "/halloween-party-decorations-with-costumes-and-ligh.jpg",
    previewDescription: "A spooky themed celebration with DJ, costumes, and themed cocktails.",
    description:
      "Our Halloween Fiesta was a spooky spectacular that brought together over 500 guests for an unforgettable night of themed Halloween celebrations. The event featured live DJ sets, a costume contest with amazing prizes, themed cocktails, and an atmosphere that perfectly blended Halloween thrills with electric energy.",
    category: "Past Event",
    type: "themed",
    highlights: [
      "Live DJ spinning Halloween-themed hits",
      "Best Costume Contest with $1000 grand prize",
      "Themed cocktail bar with signature drinks",
      "Professional photography and photo booth",
      "Chef-crafted cuisine with a spooky twist",
    ],
    gallery: [
      "/halloween-party-decorations-with-costumes-and-ligh.jpg",
      "/halloween-costume-party-group-dancing.jpg",
      "/spooky-cocktails-halloween-themed-drinks.jpg",
      "/halloween-dj-performance-event.jpg",
      "/halloween-photo-booth-props-guests.jpg",
      "/halloween-decorations-venue-setup.jpg",
    ],
    videoUrl: "/placeholder-video-halloween-highlights.mp4",
  },
  {
    id: "roaring-20s",
    title: "Roaring 20s Gala",
    date: "December 15, 2024",
    shortDate: "December 15, 2024",
    location: "Grand Ballroom",
    attendees: "350+",
    image: "/1920s-gatsby-style-party-elegant-art-deco.jpg",
    previewDescription: "Step back in time to the glamorous era of jazz and elegance.",
    description:
      "Step back in time to the golden age of jazz and glamour. Our Roaring 20s Gala transformed the Grand Ballroom into a 1920s speakeasy, complete with art deco decor, flapper dresses, dapper suits, and live jazz ensemble. Guests enjoyed prohibition-style cocktails, Charleston dance lessons, and an evening of pure elegance.",
    category: "Past Event",
    type: "themed",
    highlights: [
      "Live jazz band and swing orchestra",
      "Charleston and swing dance lessons",
      "Prohibition-era cocktail experience",
      "Period-appropriate dress code",
      "Art deco decor and vintage ambiance",
    ],
    gallery: [
      "/1920s-gatsby-style-party-elegant-art-deco.jpg",
      "/art-deco-ballroom-elegant-setup.jpg",
      "/flapper-dresses-guests-dancing.jpg",
      "/jazz-band-live-performance-1920s.jpg",
      "/vintage-cocktails-prohibition-style.jpg",
      "/gatsby-themed-entrance-decor.jpg",
    ],
    videoUrl: "/placeholder-video-roaring-20s-highlights.mp4",
  },
  {
    id: "corporate-gala",
    title: "Corporate Anniversary Gala",
    date: "September 20, 2024",
    shortDate: "September 20, 2024",
    location: "Luxury Hotel",
    attendees: "250+",
    image: "/corporate-event-elegant-ballroom-setup.jpg",
    previewDescription: "An elegant corporate celebration with live entertainment.",
    description:
      "We had the honor of creating an elegant corporate anniversary celebration that seamlessly blended professional sophistication with live entertainment. The event featured keynote speeches, awards ceremony, gourmet dining, and performances that kept guests engaged throughout the evening.",
    category: "Past Event",
    type: "corporate",
    highlights: [
      "Elegant ballroom setup with custom lighting",
      "Live jazz ensemble",
      "Gourmet multi-course dining",
      "Professional AV and presentation setup",
      "Awards ceremony and keynote speeches",
    ],
    gallery: [
      "/corporate-event-elegant-ballroom-setup.jpg",
      "/business-gala-formal-dining.jpg",
      "/corporate-awards-ceremony-stage.jpg",
      "/elegant-table-settings-corporate.jpg",
      "/live-entertainment-corporate-event.jpg",
      "/professional-event-lighting-setup.jpg",
    ],
    videoUrl: "/placeholder-video-corporate-gala-highlights.mp4",
  },
  {
    id: "new-years-bash",
    title: "New Year's Bash",
    date: "December 31, 2025",
    shortDate: "December 31, 2025",
    location: "City Center Plaza",
    attendees: "800+",
    image: "/new-years-party-fireworks-celebration.jpg",
    previewDescription: "Ring in the new year with live music, dancing, and fireworks.",
    description:
      "The biggest celebration of the year. Our New Year's Bash brought together over 800 guests for an epic countdown featuring live music, multiple DJ stages, gourmet food stations, and a spectacular fireworks display at midnight. The energy was electric as we danced into the new year together.",
    category: "Past Event",
    type: "signature",
    highlights: [
      "Multiple stages with live bands and DJs",
      "Midnight fireworks spectacular",
      "Champagne toast and countdown celebration",
      "International food and drink stations",
      "VIP lounge with premium open bar",
    ],
    gallery: [
      "/new-years-party-fireworks-celebration.jpg",
      "/countdown-celebration-crowd.jpg",
      "/champagne-toast-new-years.jpg",
      "/live-band-new-years-performance.jpg",
      "/fireworks-display-city-celebration.jpg",
      "/new-years-party-crowd-dancing.jpg",
    ],
    videoUrl: "/placeholder-video-new-years-highlights.mp4",
  },
]

export const allEvents = events

export const eventsById = Object.fromEntries(events.map((event) => [event.id, event])) as Record<string, EventData>

export const upcomingEvents = events.filter((event) => event.category === "Upcoming Event")

export const featuredUpcomingEvents = upcomingEvents.filter((event) => event.featured)

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
