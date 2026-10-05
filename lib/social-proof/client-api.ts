"use client";

import type { SocialProofRow } from "./types";

const MAX_ROWS = 10;

function isRow(v: unknown): v is SocialProofRow {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return ["first_name", "suburb", "state", "product_label", "purchased_at"].every((k) => typeof r[k] === "string" && r[k] !== "");
}

/**
 * Fetches recent real orders through this app's own `/api/social-proof` proxy.
 * Fails soft: any error, non-200 or malformed body yields an empty list, so the
 * toast simply never appears.
 */
export const socialProofApi = {
  async recentOrders(): Promise<SocialProofRow[]> {
    try {
      const res = await fetch("/api/social-proof", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (res.status !== 200) return [];
      const body = (await res.json()) as { data?: unknown };
      return Array.isArray(body.data) ? body.data.filter(isRow).slice(0, MAX_ROWS) : [];
    } catch {
      return [];
    }
  },
};
