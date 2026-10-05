import { proxyResponse } from "@/lib/http/proxy-response";
import { bookingBackend } from "@/lib/booking/backend";
import type { BookingAddonKey, BookingItemInput } from "@/lib/booking/types";

/**
 * GET /api/booking/slots?zone=&date_from=&date_to=&items=&addons= — proxies
 * `GET /api/v1/booking-slots`. Always a live client-side call, never cached
 * (same posture as PDP availability) — capacity/slot availability changes
 * constantly.
 *
 * `items`/`addons` are JSON-encoded query params rather than bracket-notation
 * (`items[0][tyre_variant_id]=...`) on this app's own route — simpler for
 * the client to build (`lib/booking/client-api.ts` just
 * `JSON.stringify`s the arrays it already has) than reconstructing Laravel's
 * array query-string convention twice. `lib/booking/backend-client.ts`
 * still builds the real bracket-notation query string Laravel expects for
 * the actual upstream call.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const zone = url.searchParams.get("zone") ?? "";
  const dateFrom = url.searchParams.get("date_from") ?? "";
  const dateTo = url.searchParams.get("date_to") ?? "";

  let items: BookingItemInput[] = [];
  let addons: BookingAddonKey[] = [];
  try {
    items = JSON.parse(url.searchParams.get("items") ?? "[]");
  } catch {
    // Malformed `items` from this app's own client is a client bug, not
    // user input — fall through with an empty cart rather than 500ing;
    // Laravel still validates the real shape server-side either way.
  }
  try {
    addons = JSON.parse(url.searchParams.get("addons") ?? "[]");
  } catch {
    // Same as above.
  }

  const result = await bookingBackend.slots(zone, dateFrom, dateTo, items, addons);
  return proxyResponse(result);
}
