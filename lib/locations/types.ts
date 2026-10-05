/**
 * State > city > suburb tree, `GET /api/v1/locations` and
 * `/locations/{state}/{city}`. Contract: docs/redesign/api-contract-phase6.md
 * section 2. (Not to be confused with `lib/location`, which is the visitor's
 * own serviceability check and zone cookie.)
 */
export interface LocationSuburb {
  name: string;
  slug: string;
  postcode: string;
  /** The zone that will actually serve this suburb. */
  service_zone_id: number;
}

export interface LocationCitySummary {
  name: string;
  slug: string;
  /** Primary zone: use as the location cookie value. */
  service_zone_id: number;
  service_zone_ids: number[];
  suburb_count: number;
}

export interface LocationCity extends LocationCitySummary {
  suburbs: LocationSuburb[];
}

export interface LocationState {
  code: string;
  name: string;
  slug: string;
  city_count: number;
  suburb_count: number;
  cities: LocationCity[];
}

export interface LocationsResponse {
  data: LocationState[];
}

export type OperatingDay = { open: string; close: string } | null;
export type OperatingHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", OperatingDay>>;

export interface CoverageZone {
  id: number;
  name: string;
  type: "radius" | "suburb_list";
  radius_km: number | null;
  operating_hours: OperatingHours;
}

export interface CityContent {
  title: string;
  slug: string;
  excerpt: string | null;
  /** Admin-authored HTML. */
  body: string;
  featured_image_path: string | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
}

export interface CityDetail {
  state: { code: string; name: string; slug: string };
  city: LocationCitySummary;
  suburbs: LocationSuburb[];
  coverage: { zones: CoverageZone[]; notes: string[] };
  content: CityContent | null;
}

export interface CityDetailResponse {
  data: CityDetail;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
