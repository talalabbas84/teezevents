import "server-only"

import QRCode from "qrcode"

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export function getPublicTicketWalletUrl(accessToken: string) {
  return new URL(`/tickets/${encodeURIComponent(accessToken)}`, getAppUrl()).toString()
}

export function getPublicTicketUrl(ticketCode: string) {
  return new URL(`/tickets/code/${encodeURIComponent(ticketCode)}`, getAppUrl()).toString()
}

export async function getTicketQrCodeDataUrl(ticketCode: string) {
  return QRCode.toDataURL(getPublicTicketUrl(ticketCode), {
    margin: 1,
    width: 320,
    color: {
      dark: "#2B2B2B",
      light: "#00000000",
    },
  })
}
