import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Cinzel } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _montserrat = Montserrat({ subsets: ["latin"] })
const _cinzel = Cinzel({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Teez Events | Premium Event Experiences",
  description:
    "Experience unforgettable events with Teez Events. From themed parties to corporate gatherings, we bring your vision to life.",
  generator: "v0.app",
  keywords: ["events", "event planning", "event management", "themed parties", "corporate events"],
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${_montserrat.className}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
