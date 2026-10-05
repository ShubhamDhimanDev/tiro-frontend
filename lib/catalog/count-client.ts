"use client";

/**
 * Browser helper for `/api/catalog/tyres/count`. Resolves to the match count, or
 * `null` when it can't be had (network failure, backend error, aborted), so the
 * caller can fall back to a plain "Apply".
 */
export async function fetchTyreCount(queryString: string, signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(`/api/catalog/tyres/count?${queryString}`, { cache: "no-store", signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { total?: number | null };
    return typeof body.total === "number" ? body.total : null;
  } catch {
    return null;
  }
}
