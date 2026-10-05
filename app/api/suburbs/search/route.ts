import { proxyResponse } from "@/lib/http/proxy-response";
import { suburbsBackend } from "@/lib/suburbs/backend";

/**
 * GET /api/suburbs/search?q= — proxies `GET /api/v1/suburbs/search` (Phase 7
 * typeahead for the fitting address). Same posture as `/api/suburbs`: the
 * browser never calls Laravel directly, and validation (2 to 60 characters)
 * stays the API's job.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await suburbsBackend.search(params.get("q"), params.get("limit"));
  return proxyResponse(result);
}
