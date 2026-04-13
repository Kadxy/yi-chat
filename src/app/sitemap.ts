import type { MetadataRoute } from "next";
import { BASE_URL } from "lib/const";
import { chatShareRepository } from "lib/db/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shares = await chatShareRepository.selectAllActiveIds();

  const shareEntries: MetadataRoute.Sitemap = shares.map((share) => ({
    url: `${BASE_URL}/share/${share.id}`,
    lastModified: share.sharedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...shareEntries,
  ];
}
