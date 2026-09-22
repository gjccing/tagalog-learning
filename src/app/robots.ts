import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const publicRules = {
  allow: "/",
  disallow: ["/api/", "/mcp"],
};

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        ...publicRules,
      },
      {
        userAgent: "OAI-SearchBot",
        ...publicRules,
      },
      {
        userAgent: "GPTBot",
        ...publicRules,
      },
      {
        userAgent: "ChatGPT-User",
        ...publicRules,
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
