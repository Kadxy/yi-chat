import type { MetadataRoute } from "next";
import { BASE_URL } from "lib/const";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/share/"],
        disallow: [
          "/chat/",
          "/settings",
          "/preferences",
          "/archived",
          "/mcp",
          "/usage",
          "/shares",
          "/admin/",
          "/api/",
          "/sign-in",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
