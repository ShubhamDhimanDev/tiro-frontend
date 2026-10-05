import { expect, type Page } from "@playwright/test";

/**
 * Fills `<AddressAutocomplete>`'s manual-entry fallback (`ManualAddressFields`,
 * `components/checkout/address-autocomplete.tsx`) — used by both checkout's
 * `<AddressStep>` and `<SavedAddressForm>` whenever no Google Maps key is
 * configured (this workspace's permanent state, per that component's own
 * doc comment).
 *
 * Fill order doesn't matter to the component any more: it now commits via a
 * `useEffect` watching all four fields (`line1`/`suburb`/`state`/`postcode`)
 * together, so whichever field is filled last always sees every field's
 * fully-current value — fixing a real stale-closure bug this test suite
 * originally found (picking State *last* used to silently never resolve;
 * see the fixed-and-verified regression coverage in
 * `tests/e2e/account/addresses.spec.ts`, "resolves regardless of fill
 * order"). State is still filled before Postcode here purely to keep this
 * helper's own diff small, not because a different order would break
 * anything now.
 *
 * Still waits for resolution to actually land before returning (either the
 * containing form's own synced `#saved-address-line1` mirror field, or a
 * caller-supplied `resolvedLine1Selector`) — `resolveSuburbId()` is a real
 * async fetch, not instantaneous, and a caller clicking "Save" immediately
 * after this returns (with no assertion of its own in between, e.g. inside
 * a longer multi-step flow) can otherwise race ahead of it.
 */
export async function fillManualAddress(
  page: Page,
  opts: { line1: string; suburb: string; state: string; postcode: string; resolvedLine1Selector?: string }
): Promise<void> {
  await page.locator("#manual-line1").fill(opts.line1);
  await page.getByRole("combobox", { name: "Suburb" }).fill(opts.suburb);
  await page.getByLabel("State").selectOption(opts.state);
  const postcodeField = page.getByRole("textbox", { name: "Postcode" });
  await postcodeField.fill(opts.postcode);
  await postcodeField.blur();

  const resolvedField = page.locator(opts.resolvedLine1Selector ?? "#saved-address-line1");
  await expect(resolvedField).toHaveValue(opts.line1, { timeout: 10_000 });
}
