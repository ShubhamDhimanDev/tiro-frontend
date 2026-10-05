import { formatAuMobileToE164 } from "@/lib/checkout/phone";
import { UNRESOLVED_SUBURB_ID } from "@/lib/checkout/address";
import type { OrderAddressInput, OrderCustomerInput } from "@/lib/orders/types";

/**
 * Client-side checks run when the customer presses "Place order". They only
 * catch things the server would reject anyway (empty required fields, a
 * malformed email or number, an address that isn't matched to a suburb), so the
 * customer gets a specific message beside the field instead of a generic
 * banner. The server stays the source of truth: its own 422 messages are merged
 * into the same error map by the checkout flow.
 *
 * Error keys match the server's field paths (`customer.name`, ...), plus two
 * for the address block: `address` (nothing usable entered yet; the address
 * fields show their own per-field messages) and `address.match` (an address
 * exists but isn't matched to a suburb we serve).
 *
 * Every message names the problem and says how to fix it.
 */
export type CheckoutErrors = Partial<
  Record<"customer.name" | "customer.email" | "customer.mobile" | "address" | "address.match", string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(customer: OrderCustomerInput | null): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = customer?.name.trim() ?? "";
  const email = customer?.email.trim() ?? "";
  const mobile = customer?.mobile?.trim() ?? "";

  if (!name) {
    errors["customer.name"] = "Enter your full name so our technician knows who to ask for.";
  }
  if (!email) {
    errors["customer.email"] = "Enter your email address. We send your booking confirmation there.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors["customer.email"] = "That email address doesn't look right. Check it has an @ and a domain, like name@example.com.";
  }
  if (mobile && !formatAuMobileToE164(mobile)) {
    errors["customer.mobile"] = "Enter an Australian mobile number, like 0412 345 678, or leave this blank.";
  }
  return errors;
}

export function validateAddress(address: OrderAddressInput | null): CheckoutErrors {
  if (!address) {
    return { address: "Enter the address where we'll fit your tyres, including suburb, state and postcode." };
  }
  if (address.suburb_id === UNRESOLVED_SUBURB_ID) {
    return {
      "address.match":
        "We haven't matched this address to a suburb we serve yet. Give it a moment, or check the suburb and postcode.",
    };
  }
  return {};
}

export function validateCheckout(customer: OrderCustomerInput | null, address: OrderAddressInput | null): CheckoutErrors {
  return { ...validateContact(customer), ...validateAddress(address) };
}

/**
 * Moves focus to the first invalid control inside `root` (the first element
 * marked `aria-invalid="true"`, or a block-level message marked
 * `data-error-focus`, in DOM order) and scrolls it into view.
 * Returns whether something was focused.
 */
export function focusFirstInvalid(root: ParentNode | null): boolean {
  const target = root?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-focus="true"]');
  if (!target) return false;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: "center", behavior: "auto" });
  return true;
}
