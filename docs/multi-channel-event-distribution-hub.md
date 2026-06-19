# Multi-Channel Event Distribution Hub

Status: Enterprise foundation implemented
Priority: High

## Positioning

Create the event once, publish it everywhere, then track performance in one dashboard.

This targets a major workflow pain for event organizers: manually recreating the same event, description, media, ticket links, and announcements across many platforms.

## Product Promise

> Create your event once. We distribute it everywhere and track results in one dashboard.

## Core Workflow

1. Organizer creates an event in Event Studio.
2. Organizer opens the Distribution Hub.
3. Organizer selects target channels.
4. AI generates channel-specific marketing assets.
5. Organizer reviews and edits copy.
6. Organizer clicks Publish.
7. The system publishes or queues content across connected platforms.
8. Platform metrics sync back into one dashboard.

Example publish checklist:

```txt
Summer Pulse
✓ Website
✓ Eventbrite
✓ Facebook Events
✓ Meetup
✓ Instagram
✓ Discord

Publish
```

## Supported Channels

### Event Platforms

- Eventbrite.
- Meetup.
- Facebook Events.
- Allevents.in.
- TicketTailor.
- Humanitix.
- Luma.
- Partiful.
- Fever.
- Bandsintown.

### Social Platforms

- Instagram.
- Facebook.
- TikTok.
- X.
- LinkedIn.

### Community Platforms

- Discord.
- WhatsApp.
- Telegram.
- Reddit.

## One-Click Publish

### Capabilities

- Publish event details to selected platforms.
- Reuse event title, date, venue, address, description, image, ticket link, and organizer details.
- Generate platform-specific descriptions and captions.
- Track publish status per platform.
- Store platform listing URLs.
- Support draft, queued, published, failed, and needs-review states.
- Surface platform-specific validation errors before publishing.

### Publishing Statuses

- Not connected.
- Not selected.
- Draft ready.
- Needs review.
- Queued.
- Publishing.
- Published.
- Failed.
- Sync paused.

## Event Sync Engine

Most tools stop at publishing. The stronger version also syncs data back into TEEZ.

### Sync Back Metrics

#### Eventbrite

- Ticket sales.
- Revenue.
- Registrations.
- Listing views.
- Referral sources where available.

#### Meetup

- RSVPs.
- Attendance.
- Member comments where available.

#### Facebook Events

- Interested count.
- Going count.
- Shares.
- Event engagement.

#### Instagram

- Post engagement.
- Reel engagement.
- Profile clicks.
- Link clicks.

### Unified Dashboard

- Per-channel publish status.
- Per-channel listing URL.
- Sales and RSVP totals.
- Revenue by platform.
- Engagement by platform.
- Click-through performance.
- Last sync timestamp.
- Sync errors and reconnection prompts.

## AI Marketing Generator

After event creation, the system generates channel-specific marketing assets.

### Generated Assets

- Instagram post caption.
- Instagram Reel concept.
- Facebook event description.
- Eventbrite description.
- Email campaign.
- SMS campaign.
- Discord announcement.
- WhatsApp announcement.
- Telegram announcement.
- LinkedIn post.
- TikTok video prompt.

### Example Asset Types

```txt
Instagram Post
Summer Pulse is back...

Facebook Event Description
Long-form copy optimized for discovery and conversion.

Eventbrite Description
Structured event copy optimized for ticket sales.

Email Campaign
Ready-to-send subject line, preview text, and body.

SMS Campaign
Short conversion-focused message.

Discord Announcement
Community-first announcement format.
```

## Marketing Score

Show organizers how complete their event marketing setup is.

Example:

```txt
Event Visibility Score: 67/100

Missing:
✓ Facebook Event
✓ Meetup Listing
✗ Email Campaign
✗ Instagram Reel
✗ Ambassador Campaign
```

### Score Inputs

- Website event page published.
- Ticketing enabled.
- Event platform listings created.
- Social posts scheduled or published.
- Email campaign created.
- SMS campaign created.
- Community announcements published.
- Ambassador links created.
- Retargeting or audience segments configured.
- Minimum media assets present.

## Influencer and Ambassador Distribution

Dance events often sell through trusted community promoters. Ambassador tracking should be native.

### Capabilities

- Create ambassador referral links.
- Track sales by ambassador.
- Track revenue by ambassador.
- Track tickets sold by ambassador.
- Create leaderboard.
- Configure rewards.
- Calculate rewards automatically.
- Export ambassador performance.

Example:

```txt
David
Sales: 34
Revenue: $1,100

Amy
Sales: 17
Revenue: $550
```

## AI Audience Targeting

Use past events and attendee data to recommend who to market to.

Example:

```txt
Best Audience:

Women 25-35
Downtown Toronto
Bachata dancers
Attended 2+ socials
```

### Recommendations

- Email segment.
- Instagram audience.
- Facebook audience.
- Retargeting audience.
- Lookalike-style audience description.
- Best send time.
- Best channel mix.

## Cross-Organizer Promotion Network

When multiple organizers use TEEZ, the platform can recommend compatible events across organizers.

Example:

```txt
Attendees of Summer Pulse may also enjoy:

Latin Vibes Social
Bachata Fridays
Toronto Salsa Festival
```

### Network Benefits

- Organizers grow together instead of competing blindly.
- Attendees discover more relevant dance events.
- TEEZ gains a durable discovery moat.

## Teez Discover

A public event discovery network for dance events.

### Capabilities

- Local dance event directory.
- Personalized recommendations.
- City filters.
- Dance style filters.
- Date filters.
- Organizer profiles.
- Featured events.
- Cross-event recommendation blocks.

Positioning:

> Eventbrite for dancers only.

## Marketing Automation Engine

Use event performance and attendee behavior to trigger marketing actions.

### Example Rules

```txt
If sales < 50
7 days before event

Action:
Send discount campaign
```

```txt
If attendance > 80%

Action:
Raise ticket price
```

```txt
If someone attended 3 salsa events

Action:
Promote salsa festival
```

### Automation Inputs

- Sales velocity.
- Days until event.
- Attendance percentage.
- Ticket tier inventory.
- Attendee history.
- RSVP behavior.
- Email engagement.
- Ambassador performance.

### Automation Actions

- Send discount campaign.
- Raise ticket price.
- Publish reminder post.
- Send community announcement.
- Notify ambassadors.
- Promote related event.
- Create retargeting segment.
- Alert organizer.

## MVP Recommendation

For a dance event company, the highest ROI first version is:

### Event Distribution Hub MVP

- Eventbrite sync.
- Facebook Events sync.
- Instagram content generator.
- Email campaign generator.
- Discord announcement generator.
- Ambassador tracking.
- Marketing analytics dashboard.

## Suggested Build Phases

### Phase 1: Distribution Workspace

- Add an event-level Distribution tab in admin.
- Add platform connection status cards.
- Add per-platform publish checklist.
- Add AI-generated copy drafts.
- Store generated marketing assets.
- Store platform listing URLs manually or through API where available.

### Phase 2: First Integrations

- Eventbrite publish/sync.
- Facebook Events publish/sync where API access allows.
- Instagram content generation and scheduling handoff.
- Discord webhook publishing.
- Email campaign generation using existing email infrastructure.

### Phase 3: Analytics and Score

- Distribution dashboard.
- Event visibility score.
- Missing-channel checklist.
- Channel performance cards.
- Sales, RSVP, engagement, and click metrics.

### Phase 4: Ambassador Engine

- Ambassador links.
- Referral attribution.
- Leaderboard.
- Reward calculation.
- Ambassador exports.

### Phase 5: Network Effects

- Cross-organizer recommendations.
- Teez Discover.
- Personalized attendee recommendations.
- Audience targeting intelligence.

## Data Model Ideas

Potential new models:

- `DistributionChannel`
- `EventDistribution`
- `EventDistributionAsset`
- `EventDistributionMetric`
- `PlatformConnection`
- `Ambassador`
- `AmbassadorLink`
- `AmbassadorReward`
- `AudienceSegment`
- `CrossPromotion`

## Admin Navigation Placement

Recommended placement:

- Event-level tab: `/admin/planning/[eventId]/distribution`
- Global channel settings: `/admin/settings/integrations`
- Network discovery admin: `/admin/discover`

## Success Metrics

- Time saved per event.
- Number of channels published per event.
- Event visibility score improvement.
- Ticket sales attributed to external platforms.
- Revenue by distribution channel.
- Ambassador-attributed sales.
- Email/SMS/social engagement.
- Organizer retention.
