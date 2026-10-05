import type { CustomerAddressRecord } from "./types";

/** Falls back to `"{line1}, {suburb} {state}"` when `label` is null — same "computed display when label is unset" convention `lib/customer-vehicles/display.ts` follows for saved vehicles. */
export function customerAddressDisplayLabel(address: CustomerAddressRecord): string {
  if (address.label) return address.label;
  return `${address.line1}, ${address.suburb.name} ${address.suburb.state}`;
}
