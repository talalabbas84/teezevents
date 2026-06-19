# TEEZ Event Website Feature Inventory

Last updated: June 19, 2026

This document lists the main product features currently represented in the application codebase.

## Public Website

### Marketing Pages

- Public homepage.
- About page.
- Team page.
- Contact page.
- Dynamic CMS-backed pages by slug.
- Shared navigation and footer.
- Responsive public layouts.

### CMS-Powered Public Pages

- Admin-created website pages.
- Draft, review, scheduled, published, and archived page statuses.
- SEO title and SEO description fields.
- Hero content with eyebrow, title, body, image, and CTA.
- Page sections:
  - Rich text.
  - Feature grid.
  - CTA band.
  - FAQ.
  - Gallery.
  - Stats.
- Navigation visibility controls.
- Navigation label and sort order.
- Page revisions.

## Events

### Public Event Discovery

- Public events listing.
- Individual public event detail pages.
- Upcoming and past event categories.
- Event kinds:
  - Themed.
  - Signature.
  - Corporate.
  - Social.
- Featured events.
- Event title, date, venue, address, host, image, and gallery.
- Preview description and full description.
- Content sections for event storytelling.
- Timeline, perks, FAQs, policies, and share text.
- RSVP capture endpoint for events.

### Admin Event Studio

- Event list and event command center.
- Mobile-friendly event studio search and filters.
- Create new events.
- Edit event details, dates, venue, address, host, image, and gallery.
- Manage event visibility and active state.
- Manage featured events.
- Configure checkout availability.
- Configure capacity and maximum tickets per order.
- Add internal ticket notes.
- Manage event content sections.
- Upload event media through Cloudinary-backed flows.
- Event-level operational stats:
  - Paid orders.
  - Tickets issued.
  - Checked-in count.
  - Reserved tickets.
  - Remaining spots.
  - Revenue.

## Ticketing and Checkout

### Checkout

- Stripe checkout integration.
- Checkout quote API.
- Checkout success and cancel pages.
- Per-event checkout enablement.
- Capacity-aware ticket purchasing.
- Maximum tickets per order.
- CAD currency support.

### Ticket Tiers

- Multiple ticket tiers per event.
- Tier name and description.
- Tier price.
- Tier quantity limit.
- Tier maximum per order.
- Tier sort order.
- Active and hidden tier states.
- Sold count, reserved count, spots left, and revenue tracking.

### Vouchers and Discounts

- Voucher codes.
- Fixed amount discounts.
- Percent discounts.
- Minimum quantity rules.
- Maximum redemption limits.
- Start and expiry dates.
- Active/inactive state.
- Redemption count and discount amount tracking.
- Admin discount-code API.

### Ticket Delivery and Access

- Ticket records per order.
- Unique ticket codes.
- Access-token based ticket page.
- Ticket-code based lookup page.
- Ticket PDF generation and download endpoint.
- QR code generation for tickets.
- Ticket delivery status tracking.
- Email delivery records.

## Admin Dashboard and Analytics

### Admin Dashboard

- Secure admin dashboard.
- Signed-in user display.
- Summary metrics:
  - Tickets issued.
  - Gross revenue.
  - Checked in.
  - Active events.
- Recent event command-center cards.
- Remaining capacity.
- Sell-through rate.
- Check-in rate.
- Revenue per event.

### Insights

- Revenue timeline chart.
- Orders and ticket sales activity.
- Door progress chart.
- Issued versus checked-in tickets.
- Average order value.
- Remaining capacity.
- Complimentary orders.
- Pending ticket holds.
- Ticket delivery rate.
- Discount amount given.
- Top ticket-tier performance.
- Voucher usage analytics.

### Data Exports

- Orders CSV export.
- Tickets/attendees CSV export.
- RSVPs CSV export.
- Planning budget export.
- Planning run-sheet export.

## Admin Authentication and Access

### Authentication

- Admin login.
- Admin logout.
- Admin session enforcement.
- Invite acceptance page for team members.
- Password setup for invited users.

### Team Collaboration and RBAC

- Team member management.
- Team member invite flow.
- Team member statuses:
  - Invited.
  - Active.
  - Disabled.
- Team roles:
  - Super Admin.
  - Admin.
  - Planner.
  - Viewer.
- Team workspaces.
- Workspace membership.
- Event-specific access.
- Event access levels:
  - View.
  - Comment.
  - Edit.
  - Manage.
- Budget management permission flag.
- Team management permission flag.
- Role-aware event access checks.

## Planning Workspace

Each event has a planning workspace with its own navigation and planning status.

### Planning Status

- Draft.
- Planning.
- Ready.
- Live.
- Completed.
- Cancelled.
- Archived.
- Status can be changed from the planning workspace header.

### Planning Dashboard

- Event planning overview.
- Readiness and progress summaries.
- Planning status context.
- Links into planning modules.
- Activity and update surfaces.
- Mobile planning event browser with search, quick filters, sorting, and shortcut actions.

### Distribution Hub

- Event-level multi-channel distribution workspace.
- Create-once, publish-everywhere operational flow.
- Supported distribution channel groups:
  - Owned channels.
  - Event platforms.
  - Social platforms.
  - Community platforms.
- Channel support:
  - Website.
  - Email.
  - SMS.
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
  - Instagram.
  - Facebook.
  - TikTok.
  - X.
  - LinkedIn.
  - Discord.
  - WhatsApp.
  - Telegram.
  - Reddit.
- Per-channel selection.
- Per-channel publish status.
- Per-channel listing URL storage.
- Per-channel sync toggle.
- Publish status states:
  - Not connected.
  - Draft.
  - Ready.
  - Needs review.
  - Queued.
  - Publishing.
  - Published.
  - Failed.
  - Sync paused.
- Event visibility score.
- Missing-channel checklist.
- Mobile jump navigation between score, channels, assets, ambassadors, and sync.
- Channel search and filters for selected, published, attention-needed, and sync-enabled channels.
- AI-style marketing asset generation.
- Editable generated marketing assets.
- Marketing asset search and status filtering.
- Asset status tracking:
  - Draft.
  - Approved.
  - Scheduled.
  - Published.
  - Archived.
- Generated asset types:
  - Instagram post.
  - Instagram Reel concept.
  - Facebook Event description.
  - Eventbrite description.
  - Email campaign.
  - SMS campaign.
  - Discord announcement.
  - WhatsApp announcement.
  - LinkedIn post.
  - TikTok script.
- Sync metric storage foundation.
- Ambassador/referral link creation.
- Ambassador sales and revenue tracking.
- Ambassador reward calculation.
- Ambassador leaderboard.
- Activity log and notification integration.
- Realtime update publishing for distribution changes.

### Tasks

- Planning task board.
- Task statuses:
  - Not started.
  - In progress.
  - Blocked.
  - Done.
  - Cancelled.
- Task priorities:
  - Low.
  - Medium.
  - High.
  - Critical.
- Task categories.
- Due dates.
- Completion timestamps.
- Parent task and subtask support.
- Multiple assignees per task.
- Assignee dropdown from team/event users.
- Task board filters for assignee, due date, priority, category, and search.
- Task comments.
- Task detail drawer.
- Date/time validation and error messages.
- Real-time task updates through the admin realtime channel.

### Collaboration

- Internal event comments and discussions.
- Comment threading support.
- Mentions.
- Pinned comments.
- Edited state.
- Entity-linked comments.
- Real-time collaboration updates.
- Activity tracking through planning activity logs.
- Notifications generated for collaboration-relevant updates.

### Checklists

- Event checklists.
- Checklist categories:
  - General.
  - Venue.
  - Vendors.
  - Staff.
  - Marketing.
  - Tickets.
  - Safety.
  - Day-of.
  - Post-event.
- Checklist sections.
- Checklist items.
- Assigned users on checklist items.
- Due dates.
- Completion state and completion timestamps.
- Sort order support.
- Validation and error handling in checklist forms.

### Timeline

- Planning timeline items.
- Due dates and milestones.
- Completion state.
- Assigned users.
- Timeline categories.
- Sort order support.

### Budget

- Budget items.
- Budget categories:
  - Venue.
  - Catering.
  - Entertainment.
  - Marketing.
  - Staff.
  - Decor.
  - Technology.
  - Security.
  - Permits.
  - Other.
- Estimated and actual cost tracking.
- Budget item statuses:
  - Planned.
  - Quoted.
  - Approved.
  - Paid.
  - Cancelled.
- Vendor association.
- Due dates.
- Payment dates.
- Budget notes.
- Budget export endpoint.

### Vendors

- Event-specific vendor management.
- Vendor types:
  - Venue.
  - Catering.
  - Entertainment.
  - AV/tech.
  - Decor.
  - Security.
  - Photography.
  - Transportation.
  - Staffing.
  - Other.
- Contact name, email, phone, and website.
- Vendor statuses:
  - Pending.
  - Contacted.
  - Quoted.
  - Confirmed.
  - Contracted.
  - Completed.
  - Cancelled.
- Confirmation timestamp.
- Contract URL.
- Quote amount.
- Paid amount.
- Notes and rating.

### Files and Documents

- Event file/resource manager.
- Direct file upload through Cloudinary.
- External URL resources.
- Resource categories:
  - Contract.
  - Receipt.
  - Floor Plan.
  - Poster.
  - Marketing Asset.
  - Vendor Document.
  - Staff Instructions.
  - Run Sheet.
  - Photo.
  - Link.
  - Other.
- Nested folder structure.
- Folders can contain subfolders.
- Default root folders:
  - Resources.
  - Important Links.
  - Contracts.
  - Vendor Documents.
  - Floor Plans.
  - Marketing Assets.
  - Receipts.
  - Run Sheets.
  - Photos.
  - Staff Instructions.
  - Other.
- Folder tree sidebar.
- Folder breadcrumbs.
- Create folder inside the current folder.
- File cards inside folders.
- Important resource marker.
- Important smart view.
- Links default into Important Links.
- Uploaded images default into Photos.
- Uploaded PDFs default into Vendor Documents.
- File metadata:
  - Name.
  - URL.
  - MIME type.
  - Size.
  - Uploader.
  - Description.
  - Task association.
  - Vendor association.
  - Visibility.
  - Workspace association.

### Notes

- Event notes.
- Note author tracking.
- Pinned notes.
- Created and updated timestamps.
- Real-time update publishing.

### Run Sheet

- Run sheet items.
- Time-based operational schedule.
- Duration tracking.
- Owners.
- Locations.
- Notes.
- Statuses:
  - Pending.
  - In progress.
  - Done.
  - Skipped.
- Sort order.
- Run-sheet export endpoint.

### Risks

- Risk register.
- Risk severity:
  - Low.
  - Medium.
  - High.
  - Critical.
- Risk probability:
  - Low.
  - Medium.
  - High.
- Risk statuses:
  - Open.
  - Monitoring.
  - Mitigated.
  - Closed.
- Mitigation plan.
- Owner.
- Due date.

### Reports

- Event planning reports page.
- Event reporting components.
- Operational summaries from planning data.
- Export-adjacent planning views.

### Post-Event Review

- Post-event review module.
- Actual attendance.
- Actual revenue.
- Vendor ratings.
- Team feedback.
- What went well.
- What went wrong.
- Lessons learned.
- Improvement notes.
- Overall rating.
- NPS score.
- Save-to-blueprint flag.
- Created-by tracking.

### AI Planning Assistant

- Event-specific AI assistant page.
- Chat-style assistant UI.
- Quick actions:
  - Generate task plan.
  - Suggest checklists.
  - Identify risks.
  - Create timeline.
  - Budget guidance.
  - Summarize progress.
- API route for event planning AI requests.

## Blueprints

### Blueprint Library

- Blueprint listing.
- Create new blueprint.
- Edit existing blueprint.
- Active/inactive blueprint state.
- Blueprint names, descriptions, categories, and tags.

### Blueprint Contents

- Blueprint tasks.
- Blueprint checklist items.
- Blueprint budget items.
- Blueprint run-sheet items.
- Blueprint timeline items.

### Blueprint Application

- Apply blueprint to an event.
- Save event planning setup as a blueprint.
- Blueprint-applied activity and notifications.

## Automations

### Automation Rules

- Automation rule management page.
- Active/inactive rules.
- Trigger configuration.
- Action configuration.
- Delay in minutes.
- Created and updated timestamps.

### Automation Triggers

- Event created.
- Event status changed.
- Blueprint applied.
- Task overdue.
- Task completed.
- Vendor not confirmed.
- Budget limit exceeded.
- Days before event.
- Checklist completed.
- Event completed.

### Automation Actions

- Create task.
- Send notification.
- Send email.
- Update status.
- Create checklist.
- Add comment.

### Automation Processing

- Admin planning cron endpoint.
- Scheduled marketing processing endpoint.

## Notifications

- Admin notifications page.
- Notification center client.
- Realtime in-app notification refresh.
- Realtime notification toast alerts.
- Admin navigation unread badge.
- Notification email delivery status tracking.
- Installed PWA phone push notifications through Web Push.
- Device push subscription management from Admin Settings.
- Push delivery status tracking.
- Notification types:
  - Task assigned.
  - Task overdue.
  - Task completed.
  - Checklist item done.
  - Comment mention.
  - Budget alert.
  - Vendor status changed.
  - Risk escalated.
  - Blueprint applied.
  - File uploaded.
  - Event status changed.
  - Automation triggered.
  - Reminder.
  - General.
- Recipient email support.
- Read/unread state.
- Read timestamp.
- Actor email.
- Entity type and entity ID.
- Deep links back into admin screens.
- Task assignment notifications for newly assigned users.
- Assignment, due-soon, and overdue task notification emails when email is configured.
- Assignment, due-soon, overdue, and general notifications can be delivered to installed phone PWAs.
- Deduped planning cron notifications for due-soon and overdue assigned tasks.

## Global Vendor Directory

- Global vendor management page.
- Vendor type.
- Contact name.
- Email.
- Phone.
- Website.
- Notes.
- Active/inactive state.
- Event-specific vendor reuse support through planning modules.

## Check-In Operations

- Admin check-in console.
- Event filter.
- Manual ticket-code lookup.
- QR scanning through browser camera when supported.
- Camera live/manual mode states.
- Ticket verification.
- Check-in recording.
- Already checked-in handling.
- Recent check-ins.
- Ticket links and wallet link fields in check-in response.

## Marketing and Communications

### Event Marketing

- Event marketing kit component.
- Event email actions.
- Event email campaign composer.
- Marketing campaigns.
- Marketing posts.
- Email campaign details.
- Email delivery tracking.
- Publish endpoint for marketing content.
- Marketing integration endpoint.
- Scheduled marketing processing endpoint.

### Email

- Email service integration.
- Ticket email delivery.
- Event email campaign support.
- Delivery status tracking.
- Failure reason tracking.

## Website CMS Admin

- CMS admin studio.
- Search pages.
- Create, edit, archive, and publish CMS pages.
- Section builder.
- Hero editor.
- SEO editor.
- Navigation controls.
- Scheduled publishing fields.
- Revision count display.

## Orders and Admin Operations

- Admin order actions.
- Admin event email actions.
- Complimentary order form.
- Admin comp-order endpoint.
- Order management API.
- Order statuses:
  - Pending.
  - Paid.
  - Cancelled.
  - Refunded.
- Order sources:
  - Stripe.
  - Admin comp.
- Ticket status tracking:
  - Held.
  - Issued.
  - Checked in.
  - Cancelled.
- Check-in timestamps.
- Stripe session and payment intent tracking.

## Real-Time Updates

- Server-sent events endpoint for admin realtime updates.
- Admin realtime listener component.
- Planning updates published for major mutations.
- Realtime events used by tasks, checklists, collaboration, files, notes, and related planning flows.
- Realtime coverage for planning budget, vendors, run sheet, timeline, risks, post-event review, blueprint application, event access, and activity log changes.
- Realtime admin event metadata refresh for event updates, archives, and deletes.
- Realtime notifications for file uploads, distribution updates, comment mentions, and task assignment changes.
- No polling required for the main collaboration update channel.

## Activity and Audit Tracking

- Planning activity log model.
- Actor email.
- Action string.
- Entity type.
- Entity ID.
- Entity name.
- Metadata.
- Created timestamp.
- Used by planning, files, team, and automation-related flows.

## Technical Foundation

- Next.js App Router.
- Progressive Web App manifest and service worker.
- React 19.
- TypeScript.
- Prisma ORM.
- PostgreSQL database.
- Stripe payments.
- Cloudinary file/media uploads.
- Nodemailer-backed email service.
- Web Push/VAPID push notification delivery.
- PDF ticket generation.
- QR code generation.
- Tailwind/Radix UI component system.
- Recharts analytics.

## Product Specs

- [Multi-Channel Event Distribution Hub](docs/multi-channel-event-distribution-hub.md)
