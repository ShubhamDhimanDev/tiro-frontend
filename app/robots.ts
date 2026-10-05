import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site/url";

/** Personalised and transactional routes are not for crawlers; the pages also carry `noindex`. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account", "/cart", "/checkout", "/booking", "/orders/", "/login", "/register", "/password-reset", "/dev/", "/price-guarantee-claims"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
