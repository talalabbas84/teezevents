import "server-only"

import nodemailer from "nodemailer"

type EmailAttachment = {
  filename: string
  content: Buffer | Uint8Array | string
  contentType?: string
}

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

type ResendEmailConfig = {
  provider: "resend"
  apiKey: string
  fromEmail: string
  fromName: string
}

type SmtpEmailConfig = {
  provider: "smtp"
  host: string
  port: number
  secure: boolean
  user?: string
  password?: string
  fromEmail: string
  fromName: string
}

type EmailServiceConfig = ResendEmailConfig | SmtpEmailConfig

function clean(value: string | undefined) {
  return value?.trim() || ""
}

function getResendConfig(): ResendEmailConfig | null {
  const apiKey = clean(process.env.RESEND_API_KEY)
  const fromEmail = clean(process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL)

  if (!apiKey || !fromEmail) {
    return null
  }

  return {
    provider: "resend",
    apiKey,
    fromEmail,
    fromName: clean(process.env.RESEND_FROM_NAME || process.env.SMTP_FROM_NAME) || "TEEZ Events",
  }
}

function getSmtpConfig(): SmtpEmailConfig | null {
  const host = clean(process.env.SMTP_HOST)
  const port = Number(process.env.SMTP_PORT || "587")
  const fromEmail = clean(process.env.SMTP_FROM_EMAIL)

  if (!host || !port || !fromEmail) {
    return null
  }

  return {
    provider: "smtp",
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user: clean(process.env.SMTP_USER) || undefined,
    password: clean(process.env.SMTP_PASSWORD) || undefined,
    fromEmail,
    fromName: clean(process.env.SMTP_FROM_NAME) || "TEEZ Events",
  }
}

export function getEmailServiceConfig(): EmailServiceConfig {
  const resendConfig = getResendConfig()

  if (resendConfig) {
    return resendConfig
  }

  const smtpConfig = getSmtpConfig()

  if (smtpConfig) {
    return smtpConfig
  }

  throw new Error("Missing RESEND_API_KEY and RESEND_FROM_EMAIL, or SMTP_HOST, SMTP_PORT, and SMTP_FROM_EMAIL.")
}

export function getEmailServiceSetupIssue() {
  try {
    getEmailServiceConfig()
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Email delivery is not configured."
  }
}

export function isEmailServiceConfigured() {
  return !getEmailServiceSetupIssue()
}

export function getEmailProviderLabel() {
  try {
    const config = getEmailServiceConfig()
    return config.provider === "resend" ? "Resend" : "SMTP"
  } catch {
    return "Not configured"
  }
}

function formatFrom(config: Pick<EmailServiceConfig, "fromEmail" | "fromName">) {
  const name = config.fromName.replace(/"/g, "'")
  return `"${name}" <${config.fromEmail}>`
}

function serializeResendAttachment(attachment: EmailAttachment) {
  const content =
    typeof attachment.content === "string"
      ? attachment.content
      : Buffer.from(attachment.content).toString("base64")

  return {
    filename: attachment.filename,
    content,
    content_type: attachment.contentType,
  }
}

async function sendWithResend(config: ResendEmailConfig, input: SendEmailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(input.headers || {}),
    },
    body: JSON.stringify({
      from: formatFrom(config),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
      attachments: input.attachments?.map(serializeResendAttachment),
      tags: input.tags,
    }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error?.message || "Resend email delivery failed.")
  }

  return payload
}

async function sendWithSmtp(config: SmtpEmailConfig, input: SendEmailInput) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  })

  return transport.sendMail({
    from: formatFrom(config),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    headers: input.headers,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: typeof attachment.content === "string" ? attachment.content : Buffer.from(attachment.content),
      contentType: attachment.contentType,
    })),
  })
}

export async function sendEmail(input: SendEmailInput) {
  const config = getEmailServiceConfig()

  if (config.provider === "resend") {
    return sendWithResend(config, input)
  }

  return sendWithSmtp(config, input)
}
