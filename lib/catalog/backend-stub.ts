import {
  FIXTURE_BRANDS,
  FIXTURE_MODELS,
  FIXTURE_POPULAR_SIZES,
  FIXTURE_VARIANTS,
  FIXTURE_ZONE_ID,
  type FixtureVariant,
} from "./fixtures";
import {
  TYRE_CATEGORIES,
  TYRE_TYPES,
  type BackendResponse,
  type BrandsResponse,
  type Paginator,
  type PopularSizesResponse,
  type StaggeredTyreSearchResult,
  type TyreCategory,
  type TyreListItem,
  type TyreModelSummary,
  type TyreType,
} from "./types";

/**
 * In-memory dev/test stub for backend-agent's Phase 1 catalogue/location
 * endpoints, active by default (see `backend.ts`) — those endpoints are
 * being built in parallel with this frontend work, not before it.
 *
 * Fixture data lives in `./fixtures.ts`. Behaviour intentionally mirrors
 * the documented contract's edge cases (422 on malformed filters, 200 with
 * `data: []` on a valid-but-empty match, 404 on unknown slug/zone) so UI
 * code exercises the real states it'll hit against live Laravel later.
 */

const DEFAULT_PER_PAGE = 12;

function validationError(errors: Record<string, string[]>): BackendResponse<unknown> {
  return { status: 422, body: { message: "The given data was invalid.", errors } };
}

function notFound(message = "Not found."): BackendResponse<unknown> {
  return { status: 404, body: { message } };
}

function parsePositiveInt(raw: string | null): number | null | undefined {
  if (raw === null) return undefined; // not provided
  if (!/^\d+$/.test(raw)) return null; // malformed
  const n = Number(raw);
  return n > 0 ? n : null;
}

function toModelSummary(modelId: number): TyreModelSummary {
  const model = FIXTURE_MODELS.find((m) => m.id === modelId)!;
  const brand = FIXTURE_BRANDS.find((b) => b.id === model.brandId)!;
  return {
    id: model.id,
    slug: model.slug,
    name: `${brand.name} ${model.name}`,
    brand,
    category: model.category,
    tyre_type: model.tyre_type,
    images: model.images,
  };
}

function toListItem(v: FixtureVariant, includeZoneFields: boolean): TyreListItem {
  const base: TyreListItem = {
    id: v.id,
    slug: v.slug,
    sku: v.sku,
    width: v.width,
    profile: v.profile,
    rim_diameter: v.rim_diameter,
    load_index: v.load_index,
    speed_rating: v.speed_rating,
    sidewall: v.sidewall,
    tyre_model: toModelSummary(v.modelId),
  };
  if (includeZoneFields) {
    base.unit_price = v.unit_price;
    base.promotional_price = v.promotional_price;
    base.stock_status = v.stock_status;
  }
  return base;
}

interface SizeFilter {
  width?: number;
  profile?: number;
  rim_diameter?: number;
}

function matchSize(v: FixtureVariant, f: SizeFilter): boolean {
  if (f.width !== undefined && v.width !== f.width) return false;
  if (f.profile !== undefined && v.profile !== f.profile) return false;
  if (f.rim_diameter !== undefined && v.rim_diameter !== f.rim_diameter) return false;
  return true;
}

interface CommonFilter {
  brand?: string;
  tyre_type?: TyreType;
  category?: TyreCategory;
}

function matchCommon(v: FixtureVariant, f: CommonFilter): boolean {
  const model = FIXTURE_MODELS.find((m) => m.id === v.modelId)!;
  if (f.brand) {
    const brand = FIXTURE_BRANDS.find((b) => b.id === model.brandId)!;
    if (brand.slug !== f.brand) return false;
  }
  if (f.tyre_type && model.tyre_type !== f.tyre_type) return false;
  if (f.category && model.category !== f.category) return false;
  return true;
}

function paginate<T>(items: T[], page: number, perPage: number): Paginator<T> {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: { current_page: page, per_page: perPage, total, last_page: lastPage },
    links: { first: null, last: null, prev: null, next: null },
  };
}

function sortItems(items: FixtureVariant[], sort: string | null): FixtureVariant[] {
  const sorted = [...items];
  if (sort === "price_asc") sorted.sort((a, b) => a.unit_price - b.unit_price);
  else if (sort === "price_desc") sorted.sort((a, b) => b.unit_price - a.unit_price);
  return sorted;
}

/**
 * Validates + resolves the zone param shared by every zone-aware endpoint.
 * Returns `{ ok: true, zoneId: string | undefined }` (undefined = not
 * supplied, a legitimate state) or `{ ok: false, response }` on an unknown
 * zone.
 *
 * The contract only explicitly documents a 404-on-unknown-zone for the
 * availability endpoint. This stub applies the same rule to the search
 * endpoint's `zone` param for consistency — a judgment call, since the
 * contract doesn't spell out list-endpoint behaviour for a stale/tampered
 * zone id; flagged in the completion report.
 */
function resolveZoneParam(zone: string | null): { ok: true; zoneId: string | undefined } | { ok: false; response: BackendResponse<unknown> } {
  if (!zone) return { ok: true, zoneId: undefined };
  if (zone !== FIXTURE_ZONE_ID) return { ok: false, response: notFound("Unknown service zone.") };
  return { ok: true, zoneId: zone };
}

async function search(params: URLSearchParams, _cacheInit?: RequestInit): Promise<BackendResponse<unknown>> {
  void _cacheInit; // stub has no real caching to configure — kept for signature parity with the live client
  const errors: Record<string, string[]> = {};

  const brand = params.get("brand") ?? undefined;
  const tyreTypeRaw = params.get("tyre_type");
  const categoryRaw = params.get("category");
  if (tyreTypeRaw && !TYRE_TYPES.includes(tyreTypeRaw as TyreType)) errors.tyre_type = ["Invalid tyre_type."];
  if (categoryRaw && !TYRE_CATEGORIES.includes(categoryRaw as TyreCategory)) errors.category = ["Invalid category."];
  const tyreType = tyreTypeRaw as TyreType | undefined;
  const category = categoryRaw as TyreCategory | undefined;

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const perPage = Math.max(1, Number(params.get("per_page") ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE);
  const sort = params.get("sort");

  const zoneResult = resolveZoneParam(params.get("zone"));
  if (!zoneResult.ok) return zoneResult.response;
  const includeZoneFields = zoneResult.zoneId !== undefined;

  const staggered = params.get("staggered") === "true";

  if (staggered) {
    const fields = [
      "front_width",
      "front_profile",
      "front_rim_diameter",
      "rear_width",
      "rear_profile",
      "rear_rim_diameter",
    ] as const;
    const parsed: Record<string, number | null> = {};
    for (const field of fields) {
      const value = parsePositiveInt(params.get(field));
      if (value === undefined || value === null) {
        errors[field] = [`${field} is required and must be a positive integer when staggered=true.`];
      } else {
        parsed[field] = value;
      }
    }
    if (Object.keys(errors).length > 0) return validationError(errors);

    const commonFilter: CommonFilter = { brand, tyre_type: tyreType, category };
    const frontMatches = sortItems(
      FIXTURE_VARIANTS.filter(
        (v) =>
          matchSize(v, { width: parsed.front_width!, profile: parsed.front_profile!, rim_diameter: parsed.front_rim_diameter! }) &&
          matchCommon(v, commonFilter)
      ),
      sort
    );
    const rearMatches = sortItems(
      FIXTURE_VARIANTS.filter(
        (v) =>
          matchSize(v, { width: parsed.rear_width!, profile: parsed.rear_profile!, rim_diameter: parsed.rear_rim_diameter! }) &&
          matchCommon(v, commonFilter)
      ),
      sort
    );

    // Independent pagination: mirrors `TyreController::index()`'s real
    // `front_page`/`rear_page` query params (distinct from the shared
    // `page` used below for non-staggered requests) so front and rear can
    // be paged through independently.
    const frontPage = Math.max(1, Number(params.get("front_page") ?? "1") || 1);
    const rearPage = Math.max(1, Number(params.get("rear_page") ?? "1") || 1);
    const front = paginate(frontMatches.map((v) => toListItem(v, includeZoneFields)), frontPage, perPage);
    const rear = paginate(rearMatches.map((v) => toListItem(v, includeZoneFields)), rearPage, perPage);

    const result: StaggeredTyreSearchResult = { data: { front, rear } };
    return { status: 200, body: result };
  }

  const width = parsePositiveInt(params.get("width"));
  const profile = parsePositiveInt(params.get("profile"));
  const rimDiameter = parsePositiveInt(params.get("rim_diameter"));
  if (width === null) errors.width = ["width must be a positive integer."];
  if (profile === null) errors.profile = ["profile must be a positive integer."];
  if (rimDiameter === null) errors.rim_diameter = ["rim_diameter must be a positive integer."];
  if (Object.keys(errors).length > 0) return validationError(errors);

  const sizeFilter: SizeFilter = {
    width: width ?? undefined,
    profile: profile ?? undefined,
    rim_diameter: rimDiameter ?? undefined,
  };
  const commonFilter: CommonFilter = { brand, tyre_type: tyreType, category };

  const matches = sortItems(
    FIXTURE_VARIANTS.filter((v) => matchSize(v, sizeFilter) && matchCommon(v, commonFilter)),
    sort
  );

  const paginated = paginate(matches.map((v) => toListItem(v, includeZoneFields)), page, perPage);
  return { status: 200, body: paginated };
}

async function popularSizes(_cacheInit?: RequestInit): Promise<BackendResponse<PopularSizesResponse>> {
  void _cacheInit;
  return { status: 200, body: { data: FIXTURE_POPULAR_SIZES } };
}

async function latestReleases(params: URLSearchParams, _cacheInit?: RequestInit): Promise<BackendResponse<unknown>> {
  void _cacheInit;
  const zoneResult = resolveZoneParam(params.get("zone"));
  if (!zoneResult.ok) return zoneResult.response;
  const includeZoneFields = zoneResult.zoneId !== undefined;

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const perPage = Math.max(1, Number(params.get("per_page") ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE);

  const modelsByRecency = [...FIXTURE_MODELS].sort(
    (a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime()
  );
  const orderedVariants = modelsByRecency.flatMap((m) => FIXTURE_VARIANTS.filter((v) => v.modelId === m.id));

  const paginated = paginate(orderedVariants.map((v) => toListItem(v, includeZoneFields)), page, perPage);
  return { status: 200, body: paginated };
}

async function brands(_cacheInit?: RequestInit): Promise<BackendResponse<BrandsResponse>> {
  void _cacheInit;
  return { status: 200, body: { data: FIXTURE_BRANDS } };
}

async function variantDetail(slug: string, _cacheInit?: RequestInit): Promise<BackendResponse<unknown>> {
  void _cacheInit;
  const variant = FIXTURE_VARIANTS.find((v) => v.slug === slug);
  if (!variant) return notFound("Tyre not found.");
  const model = FIXTURE_MODELS.find((m) => m.id === variant.modelId)!;
  const brand = FIXTURE_BRANDS.find((b) => b.id === model.brandId)!;

  return {
    status: 200,
    body: {
      data: {
        slug: variant.slug,
        width: variant.width,
        profile: variant.profile,
        rim_diameter: variant.rim_diameter,
        load_index: variant.load_index,
        speed_rating: variant.speed_rating,
        sidewall: variant.sidewall,
        tyre_model: {
          id: model.id,
          slug: model.slug,
          name: `${brand.name} ${model.name}`,
          description: model.description,
          warranty_text: model.warranty_text,
          warranty_km: model.warranty_km,
          run_flat: model.run_flat,
          construction: model.construction,
          service_inclusions: model.service_inclusions,
          images: model.images,
          category: model.category,
          tyre_type: model.tyre_type,
          brand,
        },
      },
    },
  };
}

async function availability(slug: string, zone: string | null): Promise<BackendResponse<unknown>> {
  if (!zone) {
    return validationError({ zone: ["zone is required."] });
  }
  const variant = FIXTURE_VARIANTS.find((v) => v.slug === slug);
  if (!variant) return notFound("Tyre not found.");
  if (zone !== FIXTURE_ZONE_ID) return notFound("Unknown service zone.");

  return {
    status: 200,
    body: {
      data: {
        unit_price: variant.unit_price,
        promotional_price: variant.promotional_price,
        currency: "AUD",
        stock_status: variant.stock_status,
        service_fee: 0,
      },
    },
  };
}

export const stubCatalogBackend = { search, popularSizes, latestReleases, brands, variantDetail, availability };
export type CatalogBackend = typeof stubCatalogBackend;
