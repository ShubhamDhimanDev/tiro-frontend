"use client";

import { useEffect, useState } from "react";
import { ladderFromApi, quantityLadder, type LadderRow } from "@/lib/catalog/mock-merchandising";
import type { PriceLadder, PriceLaddersResponse } from "@/lib/catalog/types";

/**
 * Per-tyre price for 1 to 5 tyres from `GET /api/catalog/tyres/price-ladders`
 * (the pricing engine, so 4 for 3 and other promotions are in the numbers).
 *
 * One in-flight request per variant is shared by every component that asks, and
 * results are cached for 60 s; `zoneKey` (optional) separates cache entries per zone. `enabled` lets a card wait until it is flipped.
 *
 * State: `loading` while fetching; `error` when it failed (callers show
 * `fallbackRows`, the flat list price, and a note, never an invented ladder).
 */
export type LadderState =
  | { status: "idle" | "loading" }
  | { status: "ready"; entry: PriceLadder; rows: LadderRow[] }
  | { status: "error" };

/** Cached for 60 s: the visitor's zone (and so zone-scoped promotions) can change between navigations. */
const TTL_MS = 60_000;
const cache = new Map<string, { entry: PriceLadder; at: number }>();

function cached(key: string): PriceLadder | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.entry;
}
const inflight = new Map<string, Promise<PriceLadder | null>>();

/** Most ids the `/api/catalog/tyres/price-ladders` proxy accepts in one request. */
const BATCH_MAX = 24;
let queue = new Map<number, { zoneKey: string; resolvers: ((entry: PriceLadder | null) => void)[] }>();
let flushScheduled = false;

async function fetchBatch(ids: number[]): Promise<Record<string, PriceLadder> | null> {
  try {
    const res = await fetch(`/api/catalog/tyres/price-ladders?ids=${ids.join(",")}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as PriceLaddersResponse).data ?? {};
  } catch {
    return null;
  }
}

/** Sends every id asked for in the same tick as one request: a results page mounts one card per tyre, each wanting its ladder. */
function flush() {
  flushScheduled = false;
  const pending = queue;
  queue = new Map();
  const ids = [...pending.keys()];
  for (let i = 0; i < ids.length; i += BATCH_MAX) {
    const chunk = ids.slice(i, i + BATCH_MAX);
    void fetchBatch(chunk).then((data) => {
      for (const id of chunk) {
        const job = pending.get(id)!;
        const entry = data?.[String(id)] ?? null;
        if (entry) cache.set(`${job.zoneKey}:${id}`, { entry, at: Date.now() });
        for (const resolve of job.resolvers) resolve(entry);
      }
    });
  }
}

function load(id: number, zoneKey: string): Promise<PriceLadder | null> {
  const key = `${zoneKey}:${id}`;
  const hit = cached(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = new Promise<PriceLadder | null>((resolve) => {
    const job = queue.get(id) ?? { zoneKey, resolvers: [] };
    job.resolvers.push(resolve);
    queue.set(id, job);
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(flush, 0);
    }
  }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function usePriceLadder(variantId: number, enabled: boolean, zoneKey: string = ""): LadderState {
  const key = `${zoneKey}:${variantId}`;
  const [result, setResult] = useState<{ key: string; entry: PriceLadder | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void load(variantId, zoneKey).then((entry) => {
      if (!cancelled) setResult({ key, entry });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, variantId, zoneKey, key]);

  if (!enabled) return { status: "idle" };
  const hit = cached(key);
  if (hit) return { status: "ready", entry: hit, rows: ladderFromApi(hit) };
  if (!result || result.key !== key) return { status: "loading" };
  return result.entry ? { status: "ready", entry: result.entry, rows: ladderFromApi(result.entry) } : { status: "error" };
}

/** Rows to show when the engine could not be reached: flat list price (mock ladder only in mock mode). */
export function fallbackRows(listCents: number): LadderRow[] {
  return quantityLadder(listCents);
}

