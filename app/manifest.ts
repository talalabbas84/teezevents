import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TEEZ Events Admin",
    short_name: "TEEZ Admin",
    description: "Event planning, ticketing, and team operations for TEEZ Events.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#F7EDDB",
    theme_color: "#eadfcb",
    icons: [
      {
        src: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
