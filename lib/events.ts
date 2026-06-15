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

const events: EventData[] = [
  {
    id: "blossom",
    title: "The Blossom Party",
    date: "Saturday, April 25, 2026",
    shortDate: "Saturday, Apr 25, 2026",
    startsAtIso: "2026-04-25T18:00:00-04:00",
    time: "6:00 PM",
    venue: "",
    location: "Toronto, ON",
    address: "Downtown Toronto",
    hostedBy: "TEEZ",
    attendees: "80",
    image: "/vibrant-dance-party-with-colorful-lights.jpg",
    previewDescription: "Our exclusive, invite-only VVIP gathering. High hospitality, deep curation, and pure insider energy.",
    description:
      "Our exclusive, invite-only VVIP gathering. High hospitality, deep curation, and pure insider energy.",
    category: "Past Event",
    type: "social",
    highlights: [
      "Invite-only spring social with a limited guest list",
      "Relaxed but elevated dance night with familiar faces and new connections",
      "Pastels and soft spring tones dress code",
      "Finger foods included throughout the evening",
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
    sections: [
      {
        title: "The Room",
        body: [
          "A relaxed but elevated social dance night with familiar faces, new connections, and a private-room energy built for VVIP guests.",
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
        title: "Why It Worked",
        body: [
          "The night stayed intimate, curated, and hospitality-forward from arrival through the final track.",
        ],
      },
    ],
    guestStats: {
      mutuals: 4,
      going: 5,
      interested: 1,
    },
    timeline: [
      {
        time: "6:00 PM",
        title: "Guest arrival",
        description: "Check in, grab a bite, and settle into the room before the night opens up.",
      },
      {
        time: "7:00 PM",
        title: "Social hour",
        description: "Music, finger foods, photos, and easy introductions across the guest list.",
      },
      {
        time: "8:30 PM",
        title: "Dance floor energy",
        description: "The playlist gets warmer and the room shifts from mingling into movement.",
      },
    ],
    perks: [
      {
        title: "Digital ticket",
        description: "Confirmation and ticket access are delivered after checkout.",
      },
      {
        title: "Finger foods included",
        description: "Light bites are available throughout the evening.",
      },
      {
        title: "Private venue details",
        description: "Exact arrival information is shared only with confirmed guests.",
      },
      {
        title: "Photo moments",
        description: "A polished spring setup designed for group and solo photos.",
      },
    ],
    faqs: [
      {
        question: "Can I bring a plus-one?",
        answer: "Yes, if tickets are still available. Please make sure every guest has their own confirmed ticket.",
      },
      {
        question: "When will I get the exact address?",
        answer: "Confirmed guests receive the final arrival details after payment or RSVP confirmation.",
      },
      {
        question: "What should I wear?",
        answer: "Pastels and soft spring tones. Keep it semi-casual, polished, and comfortable enough to move.",
      },
    ],
    policies: [
      {
        title: "Entry",
        body: "Tickets are checked at the door. Please bring your confirmation and a valid name on the order.",
      },
      {
        title: "Transfers",
        body: "If your plans change, contact TEEZ before the event so the guest name can be updated.",
      },
      {
        title: "Refunds",
        body: "All sales are final unless the event is cancelled or materially changed by TEEZ.",
      },
    ],
    shareText: "The Blossom Party by TEEZ brought the VVIP circle together.",
    kindNote:
      "By attending, you agree to be photographed and filmed for TEEZ marketing and promotional materials. Please be mindful with alcohol consumption. There’s no space for tenting or extended setup, and we encourage planning a safe ride home. To keep the atmosphere enjoyable for everyone, we ask all guests to help maintain a respectful, positive vibe throughout the night.",
    featured: false,
  },
  {
    id: "summer-pulse",
    title: "Summer Pulse",
    date: "Saturday, August 15, 2026",
    shortDate: "Saturday, Aug 15, 2026",
    startsAtIso: "2026-08-15T21:00:00-04:00",
    time: "9:00 PM",
    venue: "To be announced",
    location: "Toronto, ON",
    address: "Toronto, ON",
    hostedBy: "TEEZ",
    attendees: "Limited",
    image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
    previewDescription:
      "The ultimate mid-summer fusion party. Sandwiching a heavy Latin vibe of reggaeton, salsa, and bachata between house, hip-hop, and global Afrobeats.",
    description:
      "The ultimate mid-summer fusion party. Sandwiching a heavy Latin vibe of reggaeton, salsa, and bachata between house, hip-hop, and global Afrobeats.",
    category: "Upcoming Event",
    type: "signature",
    highlights: [
      "Heavy Latin core with reggaeton, salsa, and bachata",
      "House, hip-hop, and global Afrobeats layered into the night",
      "High-energy mid-summer crowd and curated Toronto venue",
      "Digital ticketing through the Teez Events Co. ticket platform",
    ],
    gallery: [
      "/outdoor-salsa-dancing-party-summer-evening.jpg",
      "/couples-dancing-salsa-outdoors.jpg",
      "/live-salsa-band-outdoor-stage.jpg",
      "/summer-cocktails-tropical-drinks.jpg",
      "/vibrant-dance-party-with-colorful-lights.jpg",
      "/outdoor-pavilion-evening-lights.jpg",
    ],
    videoUrl: null,
    ticketsUrl: "/checkout/summer-pulse",
    ticketNote: "Tickets are managed through the Teez Events Co. ticketing platform.",
    sections: [
      {
        title: "The Sound",
        body: [
          "Reggaeton, salsa, and bachata sit at the center, with house, hip-hop, and global Afrobeats built around the pulse of the room.",
        ],
      },
      {
        title: "The Crowd",
        body: [
          "A summer-ready fusion crowd built for movement, style, and high social energy from doors to close.",
        ],
      },
    ],
    shareText: "Summer Pulse by TEEZ is coming to Toronto on August 15, 2026.",
    featured: true,
  },
  // {
  //   id: "summer-salsa",
  //   title: "Summer Salsa Night",
  //   date: "June 2026",
  //   shortDate: "Coming June 2026",
  //   location: "Outdoor Pavilion",
  //   attendees: "400+",
  //   image: "/outdoor-salsa-dancing-party-summer-evening.jpg",
  //   previewDescription: "Dance under the stars with live salsa band and chef-crafted cuisine.",
  //   description:
  //     "Get ready for an enchanting evening under the stars. Our Summer Salsa Night will feature a live salsa band, professional dance instructors, and chef-crafted cuisine. Whether you're a seasoned dancer or a beginner, this event promises an unforgettable experience filled with rhythm, flavor, and warm summer vibes.",
  //   category: "Upcoming Event",
  //   type: "signature",
  //   highlights: [
  //     "Live salsa band performance",
  //     "Professional salsa dance lessons",
  //     "Chef-curated food stations",
  //     "Open-air dance floor under the stars",
  //     "Tropical cocktails and refreshments",
  //   ],
  //   gallery: [
  //     "/outdoor-salsa-dancing-party-summer-evening.jpg",
  //     "/live-salsa-band-outdoor-stage.jpg",
  //     "/food-catering-display.jpg",
  //     "/couples-dancing-salsa-outdoors.jpg",
  //     "/summer-cocktails-tropical-drinks.jpg",
  //     "/outdoor-pavilion-evening-lights.jpg",
  //   ],
  //   videoUrl: null,
  //   ticketsUrl: "/contact?event=summer-salsa&intent=tickets",
  //   featured: true,
  // },
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
    timeline: [
      {
        time: "8:00 PM",
        title: "Doors open",
        description: "Costumes, check-in, and first photo moments as the room fills.",
      },
      {
        time: "9:30 PM",
        title: "Main room",
        description: "DJ-led dance floor, social pockets, and Halloween visuals in full effect.",
      },
      {
        time: "11:00 PM",
        title: "Costume spotlight",
        description: "A short room-wide moment for the strongest looks of the night.",
      },
    ],
    perks: [
      {
        title: "First-access RSVP",
        description: "Join the list before ticket release and get early notice when sales open.",
      },
      {
        title: "Secret venue release",
        description: "Confirmed guests receive the exact Toronto location closer to the event.",
      },
      {
        title: "Costume culture",
        description: "A room designed around expressive outfits and photo-ready details.",
      },
      {
        title: "Limited capacity",
        description: "Guest count is capped so the night feels energetic without overcrowding.",
      },
    ],
    faqs: [
      {
        question: "Are costumes required?",
        answer: "They are strongly encouraged. The night is built around costume culture and elevated Halloween looks.",
      },
      {
        question: "When do tickets go live?",
        answer: "Ticket timing will be announced closer to the event. RSVP interest gets first access.",
      },
      {
        question: "Can I share the event with friends?",
        answer: "Yes. Final entry still depends on ticket availability and confirmed guest details.",
      },
    ],
    policies: [
      {
        title: "Guest list",
        body: "Entry is limited to confirmed guests. Ticket or RSVP details must match the person arriving.",
      },
      {
        title: "Costume safety",
        body: "Avoid props, masks, or outfits that block movement, visibility, or venue operations.",
      },
      {
        title: "Media",
        body: "Photography and video may be captured for TEEZ marketing and event recaps.",
      },
    ],
    shareText: "TEEZ is planning a Halloween Night in Toronto. I’m joining the RSVP list.",
    kindNote:
      "By attending, guests agree to be photographed and filmed for TEEZ marketing and promotional materials. Costumes should be expressive without creating safety issues or blocking movement in the venue.",
    featured: false,
  },
  {
    id: "halloween-2024",
    title: "The Inaugural Halloween Party",
    date: "October 2025",
    shortDate: "October 2025",
    location: "Toronto, ON",
    attendees: "500+",
    image: halloweenGallery[0],
    previewDescription:
      "The legendary night that started it all. Massive turnout, heavy dance floor energy, and the birth of the Teez vision.",
    description:
      "The legendary night that started it all. Massive turnout, heavy dance floor energy, and the birth of the Teez vision.",
    category: "Past Event",
    type: "themed",
    highlights: [
      "Massive turnout for the first Teez party",
      "Heavy dance floor energy from start to finish",
      "Halloween looks, social momentum, and the first spark of the Teez vision",
      "The night that set the tone for everything that followed",
    ],
    gallery: halloweenGallery,
    videoUrl: null,
  },
  {
    id: "roaring-20s",
    title: "The Roaring 20s Winter Holiday Ball",
    date: "December 2025",
    shortDate: "December 2025",
    location: "Toronto, ON",
    attendees: "350+",
    image: roaring20sGallery[0],
    previewDescription:
      "A completely sold-out, high-energy take on classic elegance. Dressed-to-the-nines crowd, a packed floor, and a midnight countdown.",
    description:
      "A completely sold-out, high-energy take on classic elegance. Dressed-to-the-nines crowd, a packed floor, and a midnight countdown.",
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
  // {
  //   id: "corporate-gala",
  //   title: "Corporate Anniversary Gala",
  //   date: "September 20, 2024",
  //   shortDate: "September 20, 2024",
  //   location: "Luxury Hotel",
  //   attendees: "250+",
  //   image: "/corporate-event-elegant-ballroom-setup.jpg",
  //   previewDescription: "An elegant corporate celebration with live entertainment.",
  //   description:
  //     "We had the honor of creating an elegant corporate anniversary celebration that seamlessly blended professional sophistication with live entertainment. The event featured keynote speeches, awards ceremony, gourmet dining, and performances that kept guests engaged throughout the evening.",
  //   category: "Past Event",
  //   type: "corporate",
  //   highlights: [
  //     "Elegant ballroom setup with custom lighting",
  //     "Live jazz ensemble",
  //     "Gourmet multi-course dining",
  //     "Professional AV and presentation setup",
  //     "Awards ceremony and keynote speeches",
  //   ],
  //   gallery: [
  //     "/corporate-event-elegant-ballroom-setup.jpg",
  //     "/business-gala-formal-dining.jpg",
  //     "/corporate-awards-ceremony-stage.jpg",
  //     "/elegant-table-settings-corporate.jpg",
  //     "/live-entertainment-corporate-event.jpg",
  //     "/professional-event-lighting-setup.jpg",
  //   ],
  //   videoUrl: "/placeholder-video-corporate-gala-highlights.mp4",
  // },
  // {
  //   id: "new-years-bash",
  //   title: "New Year's Bash",
  //   date: "December 31, 2025",
  //   shortDate: "December 31, 2025",
  //   location: "City Center Plaza",
  //   attendees: "800+",
  //   image: "/new-years-party-fireworks-celebration.jpg",
  //   previewDescription: "Ring in the new year with live music, dancing, and fireworks.",
  //   description:
  //     "The biggest celebration of the year. Our New Year's Bash brought together over 800 guests for an epic countdown featuring live music, multiple DJ stages, gourmet food stations, and a spectacular fireworks display at midnight. The energy was electric as we danced into the new year together.",
  //   category: "Past Event",
  //   type: "signature",
  //   highlights: [
  //     "Multiple stages with live bands and DJs",
  //     "Midnight fireworks spectacular",
  //     "Champagne toast and countdown celebration",
  //     "International food and drink stations",
  //     "VIP lounge with premium open bar",
  //   ],
  //   gallery: [
  //     "/new-years-party-fireworks-celebration.jpg",
  //     "/countdown-celebration-crowd.jpg",
  //     "/champagne-toast-new-years.jpg",
  //     "/live-band-new-years-performance.jpg",
  //     "/fireworks-display-city-celebration.jpg",
  //     "/new-years-party-crowd-dancing.jpg",
  //   ],
  //   videoUrl: "/placeholder-video-new-years-highlights.mp4",
  // },
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
