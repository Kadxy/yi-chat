import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Yi Chat";
  const appDescription = "A powerful AI chatbot for intelligent conversations.";

  return {
    name: appName,
    short_name: appName,
    description: appDescription,
    start_url: "/",
    scope: "/",
    id: "/",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait-primary",
  };
}
