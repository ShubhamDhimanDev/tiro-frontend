/**
 * AU-local mobile/phone input -> E.164, for `POST /api/v1/orders`'s
 * `customer.mobile` field.
 *
 * Phase 7 gap fix: `StoreOrderRequest.customer.mobile` now strictly
 * enforces E.164 server-side (`regex:/^\+[1-9]\d{6,14}$/`, previously only
 * shape-validated) and `422`s on anything else — see
 * `backend/app/Http/Requests/Api/Orders/StoreOrderRequest.php`'s own
 * docblock. The checkout wizard (`components/checkout/wizard-steps.tsx`) still
 * captures whatever the customer types (e.g. the familiar
 * `04XX XXX XXX` AU-local style) without reformatting on every keystroke —
 * reformatting live would fight the customer's own cursor position/typing
 * rhythm for no real benefit. Instead, `formatAuMobileToE164()` is called
 * once, at submit time, by `buildOrderInput()` in `lib/checkout/wizard.ts`, exactly
 * where the wire format actually matters.
 *
 * Handles every shape a customer plausibly types for an AU number, not just
 * mobiles specifically (the "Mobile" field label not withstanding — a
 * customer typing a landline here shouldn't hit a wall either):
 * - Already E.164 (`+61491570156`, with or without spaces/dashes) — passed
 *   straight through after stripping formatting.
 * - National AU format with a leading `0` (`0412 345 678`, `02 9123 4567`)
 *   — the leading `0` is replaced with `+61`, the standard national-to-
 *   E.164 transform for any AU number, not a mobile-specific rule.
 * - `61` prefix without a `+` (`61412345678`) — `+` prepended.
 * - `0011 61 ...` (the AU international-dialling prefix some customers
 *   still type out of habit) — normalized the same as the `61...` case.
 * - A bare 9-digit mobile with no leading `0` (`412345678`) — `+61`
 *   prepended; the one genuinely mobile-specific case, since AU landline
 *   numbers are never dialled without an area code when written this way.
 *
 * Returns `null` for empty input (the field is optional — see
 * `StoreOrderRequest.customer.mobile`'s `sometimes|nullable`) or anything
 * that doesn't confidently match one of the shapes above, so the caller can
 * show a clear "enter a valid number" message instead of silently
 * submitting something that will `422`.
 */
export function formatAuMobileToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{6,14}$/.test(compact)) return compact;

  const digits = trimmed.replace(/\D/g, "");
  if (/^001161\d{9}$/.test(digits)) return `+61${digits.slice(6)}`;
  if (/^61\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^4\d{8}$/.test(digits)) return `+61${digits}`;

  return null;
}
