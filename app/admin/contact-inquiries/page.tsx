import { requireAdminSession } from "@/lib/admin-auth"
import { getContactInquiries } from "@/actions/contact"
import { ContactInboxClient } from "@/components/admin/contact-inbox-client"
import { PageGuide } from "@/components/admin/page-guide"

export default async function ContactInquiriesPage() {
  await requireAdminSession()

  const inquiries = await getContactInquiries()

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c57a3a]">Admin</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Contact Inquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Messages sent from the "Get in Touch" form on the website.
          </p>
        </div>

        <div className="mb-4">
          <PageGuide
            id="contact-inquiries"
            title="Managing Inquiries"
            subtitle="Stay on top of every message sent through your website"
            steps={[
              { title: "New inquiries appear at the top", description: "Every time someone fills out the contact form on your website, their message shows up here instantly." },
              { title: "Mark as Read", description: "Click on an inquiry to open it. Change the status to 'Read' so your team knows it's been seen." },
              { title: "Add admin notes", description: "Write internal notes on any inquiry — follow-up reminders, what was discussed, next steps. Guests never see these." },
              { title: "Reply via email", description: "Click the email address to open your email app and reply directly to the person." },
            ]}
            tips={[
              "New = not yet seen, Read = opened, Replied = you've responded, Archived = done",
              "Use filters at the top to focus on New inquiries only",
              "Copy the phone number to WhatsApp them directly for a faster response",
            ]}
          />
        </div>

        <ContactInboxClient initialInquiries={inquiries} />
      </div>
    </main>
  )
}
