import { formatAuMobileToE164 } from "@/lib/checkout/phone";
import { UNRESOLVED_SUBURB_ID } from "@/lib/checkout/address";
import type { OrderAddressInput, OrderCreateInput, OrderCustomerInput, OrderVehicleInput, OrderWheel } from "@/lib/orders/types";

/**
 * Pure helpers and types for the 4-step checkout wizard: 1 Date & Time,
 * 2 Fitting Details, 3 Select Tyres, 4 Payment. Validation messages name the
 * problem and say how to fix it.
 */

export const WIZARD_STEPS = [
  { key: "date", title: "Date & Time" },
  { key: "details", title: "Fitting Details" },
  { key: "tyres", title: "Select Tyres" },
  { key: "payment", title: "Payment" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];

export const WHEELS = [
  { key: "fl", label: "Front left" },
  { key: "fr", label: "Front right" },
  { key: "rl", label: "Rear left" },
  { key: "rr", label: "Rear right" },
  { key: "spare", label: "Spare" },
] as const;

export type WheelKey = (typeof WHEELS)[number]["key"];

export interface WizardDetails {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  /** Optional: subscribe to email updates (sent as `newsletter_opt_in`). */
  newsletter: boolean;
}

export interface WizardVehicle {
  rego: string;
  state: string;
  colour: string;
  make: string;
  model: string;
  instructions: string;
  wheels: WheelKey[];
  /** A saved vehicle's catalogue id, when the customer picked one (signed in). */
  vehicleId: number | null;
}

export const EMPTY_DETAILS: WizardDetails = { firstName: "", lastName: "", mobile: "", email: "", newsletter: false };
export const EMPTY_VEHICLE: WizardVehicle = { rego: "", state: "", colour: "", make: "", model: "", instructions: "", wheels: [], vehicleId: null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type DetailsErrors = Partial<Record<Exclude<keyof WizardDetails, "newsletter"> | "address", string>>;

/** The fields the order API needs on step 2. `address` is the resolved address from the address step (or `null` until one is complete). */
export function validateDetails(d: WizardDetails, address: OrderAddressInput | null): DetailsErrors {
  const e: DetailsErrors = {};
  if (!d.firstName.trim()) e.firstName = "Enter your first name.";
  if (!d.lastName.trim()) e.lastName = "Enter your last name.";
  if (!d.mobile.trim()) e.mobile = "Enter your mobile number so our technician can reach you.";
  else if (!formatAuMobileToE164(d.mobile)) e.mobile = "Enter an Australian mobile number, like 0412 345 678.";
  if (!d.email.trim()) e.email = "Enter your email address. We send your booking confirmation there.";
  else if (!EMAIL_PATTERN.test(d.email.trim())) e.email = "That email address does not look right. Check it has an @ and a domain.";
  if (!address) e.address = "Enter the address where we will fit your tyres, including suburb, state and postcode.";
  else if (address.suburb_id === UNRESOLVED_SUBURB_ID) {
    e.address = "We have not matched this address to a suburb we serve yet. Give it a moment, or check the suburb and postcode.";
  }
  return e;
}

/** How many wheels the customer must tick: one per tyre in the cart, at most the five positions. */
export function requiredWheels(totalTyres: number): number {
  return Math.max(1, Math.min(totalTyres, WHEELS.length));
}

export function wheelsMessage(selected: number, required: number): string | null {
  if (selected === required) return null;
  const noun = required === 1 ? "tyre" : "tyres";
  return `Select ${required} ${noun} to be replaced (${selected} selected).`;
}

/** Max length of the order `notes` field. */
const MAX_NOTES = 2000;

/** Builds the `POST /orders` body from the wizard state. `null` while the mobile number cannot be normalised. */
export function buildOrderInput(args: {
  bookingId: number;
  details: WizardDetails;
  address: OrderAddressInput;
  vehicle: WizardVehicle;
}): OrderCreateInput | null {
  const mobile = formatAuMobileToE164(args.details.mobile);
  if (!mobile) return null;
  const customer: OrderCustomerInput = {
    name: `${args.details.firstName.trim()} ${args.details.lastName.trim()}`.trim(),
    email: args.details.email.trim(),
    mobile,
  };
  const v = args.vehicle;
  const text = (s: string) => s.trim() || undefined;
  const vehicle: OrderVehicleInput = {
    rego: v.rego.trim() || null,
    state: v.state || null,
    vehicle_id: v.vehicleId,
    make: text(v.make),
    model: text(v.model),
    colour: text(v.colour),
    wheels: v.wheels.map((k) => k.toUpperCase() as OrderWheel),
  };
  const notes = v.instructions.trim();
  return {
    booking_id: args.bookingId,
    customer,
    address: args.address,
    vehicle,
    ...(notes ? { notes: notes.slice(0, MAX_NOTES) } : {}),
    ...(args.details.newsletter ? { newsletter_opt_in: true } : {}),
  };
}
