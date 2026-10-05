import { describe, expect, it } from "vitest";
import { focusFirstInvalid, validateAddress, validateCheckout, validateContact } from "@/lib/checkout/validate";

const address = { suburb_id: 88, line1: "12 Example St", lat: 0, lng: 0 };

describe("checkout validation messages", () => {
  it("names each empty required field and says how to fix it", () => {
    const errors = validateCheckout(null, null);
    expect(errors["customer.name"]).toMatch(/full name/i);
    expect(errors["customer.email"]).toMatch(/email address/i);
    expect(errors.address).toMatch(/suburb, state and postcode/i);
  });

  it("explains a malformed email and an unusable mobile number", () => {
    const errors = validateContact({ name: "Sam", email: "sam@", mobile: "12345" });
    expect(errors["customer.email"]).toMatch(/@ and a domain/);
    expect(errors["customer.mobile"]).toMatch(/0412 345 678/);
  });

  it("accepts a good contact with an optional, blank mobile", () => {
    expect(validateContact({ name: "Sam", email: "sam@example.com", mobile: null })).toEqual({});
    expect(validateContact({ name: "Sam", email: "sam@example.com", mobile: "0412 345 678" })).toEqual({});
  });

  it("flags an address that has not been matched to a suburb yet", () => {
    expect(validateAddress({ ...address, suburb_id: 0 })["address.match"]).toMatch(/matched this address/);
    expect(validateAddress(address)).toEqual({});
  });
});

describe("focusFirstInvalid", () => {
  it("focuses the first aria-invalid control in DOM order", () => {
    document.body.innerHTML = `<div id="r"><input id="ok"/><input id="a" aria-invalid="true"/><input id="b" aria-invalid="true"/></div>`;
    expect(focusFirstInvalid(document.getElementById("r"))).toBe(true);
    expect(document.activeElement?.id).toBe("a");
  });

  it("returns false when nothing is invalid", () => {
    document.body.innerHTML = `<div id="r"><input/></div>`;
    expect(focusFirstInvalid(document.getElementById("r"))).toBe(false);
  });
});
