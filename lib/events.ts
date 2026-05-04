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
      // "BYOB with no bar service onsite",
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
          // "Drinks are BYOB and there is no bar service onsite.",
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
    id: "halloween-2026",
    title: "Halloween Night",
    date: "Saturday, October 31, 2026",
    shortDate: "Saturday, Oct 31, 2026",
    startsAtIso: "2026-10-31T20:00:00-04:00",
    time: "8:00 PM",
    venue: "Secret Venue",
    location: "Toronto",
    address: "Toronto, ON",
    hostedBy: "TEEZ",
    attendees: "Limited",
    image: halloweenGallery[0],
    previewDescription:
      "A cinematic Halloween party with costumes, moody lighting, music, photo moments, and a room built for full spooky-season energy.",
    description:
      "Halloween Night is the next TEEZ themed experience: a dark, stylish, high-energy celebration built around costumes, music, movement, and atmospheric visuals. Expect a room that feels immersive from the moment guests arrive, with photo-ready details, a sharp dress-up culture, and the kind of social flow that keeps people moving all night.",
    category: "Upcoming Event",
    type: "themed",
    highlights: [
      "Costume-forward Halloween theme with elevated party styling",
      "DJ-led dance floor and moody room lighting",
      "Photo moments designed for groups, couples, and solo portraits",
      "Limited guest list to keep the room energetic and manageable",
      "Exact venue details shared with confirmed guests",
    ],
    gallery: halloweenGallery,
    videoUrl: null,
    ticketsUrl: "/contact?event=halloween-2026&intent=rsvp",
    ticketNote:
      "Tickets and venue details will be released closer to the event. Join the RSVP list to get first access when sales open.",
    spotsLeft: 250,
    capacity: 250,
    sections: [
      {
        title: "The Mood",
        body: [
          "Dark, polished, and playful. This is Halloween without the throwaway decorations: cinematic lighting, strong outfits, and a room that photographs beautifully.",
        ],
      },
      {
        title: "Dress Code",
        body: [
          "Costumes are strongly encouraged.",
          "Think character, texture, drama, and details that make people stop and ask for a photo.",
        ],
      },
      {
        title: "Guest Flow",
        body: [
          "The night is designed around easy arrivals, social pockets, photo moments, and a dance floor that builds as the room fills.",
        ],
      },
      {
        title: "Ticketing",
        body: [
          "RSVP interest is open now. Ticket price, venue, and final capacity will be announced before checkout goes live.",
        ],
      },
    ],
    kindNote:
      "By attending, guests agree to be photographed and filmed for TEEZ marketing and promotional materials. Costumes should be expressive without creating safety issues or blocking movement in the venue.",
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
    image: roaring20sGallery[0],
    previewDescription: "A Gatsby-inspired night of jazz, pearls, champagne energy, and full-room glamour.",
    description:
      "Step back in time to the golden age of jazz and glamour. Our Roaring 20s Gala transformed the room into a 1920s-style social, with pearls, suits, shimmer, dancing, cinematic lighting, and an atmosphere built for people to arrive as guests and leave feeling like they were part of a scene.",
    category: "Past Event",
    type: "themed",
    highlights: [
      "Live jazz band and swing orchestra",
      "Charleston and swing dance lessons",
      "Prohibition-era cocktail experience",
      "Period-appropriate dress code",
      "Art deco decor and vintage ambiance",
    ],
    gallery: roaring20sGallery,
    videoUrl: "/placeholder-video-roaring-20s-highlights.mp4",
    sections: [
      {
        title: "The Atmosphere",
        body: [
          "The night leaned into Gatsby-era style without feeling like a costume party. Warm lighting, dressed-up guests, and a lively dance floor gave the event a cinematic quality from the first arrival.",
        ],
      },
      {
        title: "Guest Experience",
        body: [
          "Guests had a clear theme to follow, easy photo moments throughout the room, and a flow that moved naturally from mingling to dancing to full celebration.",
        ],
      },
      {
        title: "Production Details",
        body: [
          "The visual direction focused on elegance, movement, and social energy: textured outfits, intimate framing, and a gallery that feels alive rather than staged.",
        ],
      },
      {
        title: "Why It Worked",
        body: [
          "The theme was specific enough to inspire people, but flexible enough that everyone could participate comfortably. That balance is where TEEZ events come alive.",
        ],
      },
    ],
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
