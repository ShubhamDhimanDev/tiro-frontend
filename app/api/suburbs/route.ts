import { proxyResponse } from "@/lib/http/proxy-response";
import { suburbsBackend } from "@/lib/suburbs/backend";

/**
 * GET /api/suburbs?postcode=&name= — proxies `GET /api/v1/suburbs`
 * (docs/architecture/02-api-contract.md's "`GET /api/v1/suburbs` —
 * resolving a `Suburb.id`" section). The browser calls this Route Handler
 * rather than Laravel directly — same posture as every other domain proxy
 * in this app (avoids needing CORS on the Laravel API for a public,
 * unauthenticated endpoint, keeps `LARAVEL_API_URL` server-only).
 *
 * Doesn't pre-validate `postcode`/`name`'s presence or shape itself — it
 * forwards whatever (or nothing) came in and lets backend-agent's real
 * `422` validation stay the single source of truth for that rule, same
 * posture as `app/api/vehicles/models/route.ts` not pre-checking `make`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const postcode = params.get("postcode");
  const name = params.get("name");

  const result = await suburbsBackend.lookup(postcode, name);
  return proxyResponse(result);
}
