import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // "Find by vehicle" was removed from the storefront at the client's request (2026-11-18).
      // Keep old links, bookmarks and indexed URLs working by sending them to the size search.
      { source: "/tyres/by-vehicle", destination: "/tyres", permanent: true },
    ];
  },
};

export default nextConfig;
