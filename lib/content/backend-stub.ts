import {
  FIXTURE_CONTENT_PAGES,
  FIXTURE_CONTENT_PAGE_SUMMARIES,
  FIXTURE_FAQS,
  FIXTURE_FAQS_BY_CONTENT_PAGE_ID,
} from "./fixtures";
import { CONTENT_PAGE_TYPES } from "./types";
import type { BackendResponse } from "./types";

/**
 * In-memory dev/test stub for `/api/v1/content/*`, opt-in only via
 * `CONTENT_BACKEND=stub` — see `backend.ts`. The real endpoints were
 * confirmed live and exercised end-to-end this round (see
 * `backend-client.ts`'s doc comment), so live is the default; this stub
 * exists purely for isolated component tests that shouldn't depend on a
 * running Laravel process, same posture as every other domain's stub.
 *
 * Mirrors the documented edge cases: `type` missing/unrecognized on the
 * listing endpoint is `422`; an unmatched `category`/`content_page_id` is
 * `200` with `data: []`, never `404`; a slug that doesn't exist for the
 * given `type` (or exists but isn't published) is `404`.
 */

function validationError(errors: Record<string, string[]>): BackendResponse<unknown> {
  return { status: 422, body: { message: "The given data was invalid.", errors } };
}

function notFound(): BackendResponse<unknown> {
  return { status: 404, body: { message: "Not found." } };
}

function paginate<T>(data: T[]) {
  return {
    data,
    meta: { current_page: 1, from: data.length > 0 ? 1 : null, last_page: 1, per_page: 15, to: data.length > 0 ? data.length : null, total: data.length },
    links: { first: null, last: null, prev: null, next: null },
  };
}

async function pages(params: URLSearchParams): Promise<BackendResponse<unknown>> {
  const type = params.get("type");
  if (!type || !(CONTENT_PAGE_TYPES as readonly string[]).includes(type)) {
    return validationError({ type: ["The selected type is invalid."] });
  }

  const category = params.get("category");
  let rows = FIXTURE_CONTENT_PAGE_SUMMARIES.filter((page) => page.type === type);
  if (category) rows = rows.filter((page) => page.category === category);

  return { status: 200, body: paginate(rows) };
}

async function pageDetail(type: string, slug: string): Promise<BackendResponse<unknown>> {
  if (!(CONTENT_PAGE_TYPES as readonly string[]).includes(type)) return notFound();

  const page = FIXTURE_CONTENT_PAGES.find((p) => p.type === type && p.slug === slug);
  if (!page) return notFound();

  return { status: 200, body: { data: page } };
}

async function faqs(params: URLSearchParams): Promise<BackendResponse<unknown>> {
  const category = params.get("category");
  const contentPageIdRaw = params.get("content_page_id");
  const contentPageId = contentPageIdRaw ? Number(contentPageIdRaw) : null;

  if (category) {
    return { status: 200, body: { data: FIXTURE_FAQS.filter((faq) => faq.category === category) } };
  }
  if (contentPageId) {
    return { status: 200, body: { data: FIXTURE_FAQS_BY_CONTENT_PAGE_ID[contentPageId] ?? [] } };
  }
  // Neither filter: every published *global* FAQ. The fixture set has no
  // `content_page_id` field to distinguish on (page-scoped rows live only
  // in FIXTURE_FAQS_BY_CONTENT_PAGE_ID), so "global" here is everything in
  // the flat FIXTURE_FAQS list.
  return { status: 200, body: { data: FIXTURE_FAQS } };
}

export const stubContentBackend = { pages, pageDetail, faqs };
export type ContentBackend = typeof stubContentBackend;
