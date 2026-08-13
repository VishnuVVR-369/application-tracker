import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Way2More Application Tracker",
    short_name: "Way2More",
    description: "Capture and track job applications from Android or desktop.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    orientation: "any",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icons/way2more-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/way2more-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/way2more-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/way2more-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: "/capture",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    shortcuts: [
      {
        name: "Add application",
        short_name: "Add job",
        description: "Open a blank mobile application capture form.",
        url: "/capture?source=shortcut",
        icons: [
          {
            src: "/icons/way2more-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  }
}
