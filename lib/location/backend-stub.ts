import type { ServiceabilityCheckInput, ServiceabilityResult, BackendResponse } from "./types";

/**
 * In-memory dev/test stub for `POST /api/v1/serviceability`, active by
 * default (see `backend.ts`) — backend-agent's Phase 1 endpoints are being
 * built in parallel with this frontend work, not before it, so there is no
 * live endpoint to call yet.
 *
 * Fixture geography: a single "Melbourne Metro" zone covering VIC postcodes
 * 3000–3207 (inner/middle Melbourne) and a short curated suburb-name list.
 * Anything else resolves as not serviceable, with a small fixed
 * `suggested_areas` list — enough to exercise every UI state (serviceable,
 * unserviceable-with-suggestions, validation) without a real backend.
 */

const ZONE_ID = "1";
const ZONE_LABEL = "Melbourne Metro";

const SERVICEABLE_SUBURBS: Record<string, string> = {
  richmond: "3121",
  fitzroy: "3065",
  "st kilda": "3182",
  brunswick: "3056",
  "south yarra": "3141",
  carlton: "3053",
  footscray: "3011",
  "box hill": "3128",
};

const SUGGESTED_AREAS = ["Richmond VIC 3121", "Fitzroy VIC 3065", "St Kilda VIC 3182"];

function isServiceablePostcode(postcode: string): boolean {
  const n = Number(postcode);
  return Number.isInteger(n) && n >= 3000 && n <= 3207;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

async function check(input: ServiceabilityCheckInput): Promise<BackendResponse<ServiceabilityResult>> {
  const postcode = input.postcode?.trim();
  const suburb = input.suburb ? normalize(input.suburb) : undefined;

  if (!postcode && !suburb) {
    return {
      status: 422,
      body: {
        // Stub keeps the shape the frontend already knows how to render for
        // 422s (message/errors) even though ServiceabilityResult doesn't
        // formally include `errors` — cast at the call site.
        serviceable: false,
        service_zone_id: null,
        label: null,
        suggested_areas: [],
      } as unknown as ServiceabilityResult,
    };
  }

  const serviceable = postcode ? isServiceablePostcode(postcode) : suburb! in SERVICEABLE_SUBURBS;

  if (serviceable) {
    return {
      status: 200,
      body: {
        serviceable: true,
        service_zone_id: ZONE_ID,
        label: ZONE_LABEL,
        suggested_areas: [],
      },
    };
  }

  return {
    status: 200,
    body: {
      serviceable: false,
      service_zone_id: null,
      label: null,
      suggested_areas: SUGGESTED_AREAS,
    },
  };
}

export const stubLocationBackend = { check };
export type LocationBackend = typeof stubLocationBackend;
