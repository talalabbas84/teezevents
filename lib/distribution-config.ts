export const DISTRIBUTION_PLATFORMS = [
  { platform: "WEBSITE", label: "Website", channelType: "OWNED", description: "Event page on your TEEZ website." },
  { platform: "EMAIL", label: "Email Campaign", channelType: "OWNED", description: "Owned audience campaign." },
  { platform: "SMS", label: "SMS Campaign", channelType: "OWNED", description: "Short high-intent reminder campaign." },
  { platform: "EVENTBRITE", label: "Eventbrite", channelType: "EVENT_PLATFORM", description: "Ticketing and discovery listing." },
  { platform: "MEETUP", label: "Meetup", channelType: "EVENT_PLATFORM", description: "Community RSVP listing." },
  { platform: "FACEBOOK_EVENTS", label: "Facebook Events", channelType: "EVENT_PLATFORM", description: "Facebook event listing." },
  { platform: "ALLEVENTS", label: "Allevents.in", channelType: "EVENT_PLATFORM", description: "Event discovery listing." },
  { platform: "TICKETTAILOR", label: "TicketTailor", channelType: "EVENT_PLATFORM", description: "External ticketing listing." },
  { platform: "HUMANITIX", label: "Humanitix", channelType: "EVENT_PLATFORM", description: "External ticketing listing." },
  { platform: "LUMA", label: "Luma", channelType: "EVENT_PLATFORM", description: "Community event listing." },
  { platform: "PARTIFUL", label: "Partiful", channelType: "EVENT_PLATFORM", description: "Social invite listing." },
  { platform: "FEVER", label: "Fever", channelType: "EVENT_PLATFORM", description: "Experience marketplace listing." },
  { platform: "BANDSINTOWN", label: "Bandsintown", channelType: "EVENT_PLATFORM", description: "Artist and live-event discovery." },
  { platform: "INSTAGRAM", label: "Instagram", channelType: "SOCIAL", description: "Feed, story, and reel distribution." },
  { platform: "FACEBOOK", label: "Facebook", channelType: "SOCIAL", description: "Page post distribution." },
  { platform: "TIKTOK", label: "TikTok", channelType: "SOCIAL", description: "Short-form video distribution." },
  { platform: "X", label: "X", channelType: "SOCIAL", description: "Short social updates." },
  { platform: "LINKEDIN", label: "LinkedIn", channelType: "SOCIAL", description: "Professional audience post." },
  { platform: "DISCORD", label: "Discord", channelType: "COMMUNITY", description: "Community announcement." },
  { platform: "WHATSAPP", label: "WhatsApp", channelType: "COMMUNITY", description: "Group announcement." },
  { platform: "TELEGRAM", label: "Telegram", channelType: "COMMUNITY", description: "Channel announcement." },
  { platform: "REDDIT", label: "Reddit", channelType: "COMMUNITY", description: "Community subreddit post." },
] as const

export type DistributionPlatform = (typeof DISTRIBUTION_PLATFORMS)[number]["platform"]
export type DistributionChannelType = (typeof DISTRIBUTION_PLATFORMS)[number]["channelType"]

export const DISTRIBUTION_STATUS_OPTIONS = [
  "NOT_CONNECTED",
  "DRAFT",
  "READY",
  "NEEDS_REVIEW",
  "QUEUED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "SYNC_PAUSED",
] as const

export type DistributionStatus = (typeof DISTRIBUTION_STATUS_OPTIONS)[number]

export const ASSET_TYPE_LABELS = {
  INSTAGRAM_POST: "Instagram Post",
  INSTAGRAM_REEL: "Instagram Reel",
  FACEBOOK_EVENT: "Facebook Event Description",
  EVENTBRITE_DESCRIPTION: "Eventbrite Description",
  EMAIL_CAMPAIGN: "Email Campaign",
  SMS_CAMPAIGN: "SMS Campaign",
  DISCORD_ANNOUNCEMENT: "Discord Announcement",
  WHATSAPP_ANNOUNCEMENT: "WhatsApp Announcement",
  TELEGRAM_ANNOUNCEMENT: "Telegram Announcement",
  LINKEDIN_POST: "LinkedIn Post",
  TIKTOK_SCRIPT: "TikTok Script",
  X_POST: "X Post",
  REDDIT_POST: "Reddit Post",
  GENERAL_COPY: "General Copy",
} as const

export type DistributionAssetType = keyof typeof ASSET_TYPE_LABELS

export const ASSET_STATUS_OPTIONS = [
  "DRAFT",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const

export type DistributionAssetStatus = (typeof ASSET_STATUS_OPTIONS)[number]

export function getPlatformLabel(platform: DistributionPlatform | string) {
  return DISTRIBUTION_PLATFORMS.find((item) => item.platform === platform)?.label ?? platform
}

export function getChannelLabel(channelType: DistributionChannelType | string) {
  switch (channelType) {
    case "OWNED":
      return "Owned"
    case "EVENT_PLATFORM":
      return "Event Platforms"
    case "SOCIAL":
      return "Social"
    case "COMMUNITY":
      return "Community"
    default:
      return channelType
  }
}
