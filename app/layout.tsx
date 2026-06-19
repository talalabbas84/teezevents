import type React from "react"
import type { Metadata, Viewport } from "next"
import { Montserrat, Cinzel } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const _montserrat = Montserrat({ subsets: ["latin"] })
const _cinzel = Cinzel({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Teez Events Co. | Premium Event Experiences",
  description:
    "Experience unforgettable events with Teez Events Co. From themed parties to signature social nights, we bring your vision to life.",
  keywords: ["events", "event planning", "event management", "themed parties", "corporate events"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TEEZ Admin",
    statusBarStyle: "default",
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eadfcb",
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
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
