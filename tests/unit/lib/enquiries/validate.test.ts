import { describe, expect, it } from "vitest";
import { firstErrorField, normaliseRego, toEnquiryPayload, validateEnquiry } from "@/lib/enquiries/validate";
import type { EnquiryInput } from "@/lib/enquiries/types";

const base: EnquiryInput = { type: "contact", name: "Jane Citizen", email: "jane@example.com", message: "Do you fit run-flat tyres?" };

describe("validateEnquiry", () => {
  it("accepts a valid contact enquiry", () => {
    expect(validateEnquiry(base)).toEqual({});
  });

  it("asks for a type, a name and an email with the contract wording", () => {
    expect(validateEnquiry({ ...base, type: "" }).type).toBe("Please choose what your enquiry is about.");
    const errors = validateEnquiry({ type: "contact", name: " ", email: "nope", message: "" });
    expect(errors.name).toBe("Please tell us your name.");
    expect(errors.email).toBe("That email address does not look right. Check it and try again.");
    expect(errors.message).toBe("Please tell us how we can help.");
  });

  it("checks phone shape (8 to 20 chars of digits, + ( ) - and spaces)", () => {
    expect(validateEnquiry({ ...base, phone: "0412 345 678" }).phone).toBeUndefined();
    expect(validateEnquiry({ ...base, phone: "+61 (3) 9000-1234" }).phone).toBeUndefined();
    expect(validateEnquiry({ ...base, phone: "12345" }).phone).toBe("Enter a valid phone number, for example 0412 345 678.");
    expect(validateEnquiry({ ...base, phone: "call me maybe" }).phone).toBe("Enter a valid phone number, for example 0412 345 678.");
  });

  it("makes the message optional outside contact but bounds it", () => {
    expect(validateEnquiry({ ...base, type: "quote", tyre_size: "205/55R16", phone: "0400000000", message: "" }).message).toBeUndefined();
    expect(validateEnquiry({ ...base, message: "hey" }).message).toMatch(/at least 5/);
    expect(validateEnquiry({ ...base, message: "x".repeat(3001) }).message).toMatch(/3,000/);
  });

  it("quote: needs a phone, and a tyre size or a plate with its state", () => {
    const errors = validateEnquiry({ type: "quote", name: "Sam", email: "sam@example.com" });
    expect(errors.phone).toBe("Please enter a phone number so we can call you back.");
    expect(errors.tyre_size).toBe("Enter your tyre size (for example 205/55R16) or your number plate.");

    expect(validateEnquiry({ type: "quote", name: "Sam", email: "sam@example.com", phone: "0400000000", rego: "abc 123" }).rego_state).toBe(
      "Choose the state your number plate is registered in.",
    );
    expect(
      validateEnquiry({ type: "quote", name: "Sam", email: "sam@example.com", phone: "0400000000", rego: "abc 123", rego_state: "VIC" }),
    ).toEqual({});
  });

  it("quote: rejects a plate with punctuation and a bad postcode", () => {
    const errors = validateEnquiry({
      type: "quote",
      name: "Sam",
      email: "sam@example.com",
      phone: "0400000000",
      tyre_size: "205/55R16",
      rego: "AB!123",
      rego_state: "VIC",
      postcode: "31",
    });
    expect(errors.rego).toBeDefined();
    expect(errors.postcode).toBe("Enter a 4-digit postcode.");
  });

  it("fleet: company, fleet size and phone are required", () => {
    const errors = validateEnquiry({ type: "fleet", name: "Pat", email: "pat@acme.example" });
    expect(errors.phone).toBe("Please enter a phone number so we can call you back.");
    expect(errors.company).toBe("Please enter your company name.");
    expect(errors.fleet_size).toBe("Please tell us roughly how many vehicles are in your fleet.");
    expect(validateEnquiry({ type: "fleet", name: "Pat", email: "pat@acme.example", phone: "0400000000", company: "Acme", fleet_size: "0" }).fleet_size).toMatch(
      /between 1 and 100,000/,
    );
    expect(validateEnquiry({ type: "fleet", name: "Pat", email: "pat@acme.example", phone: "0400000000", company: "Acme", fleet_size: "42" })).toEqual({});
  });

  it("out of area: needs a suburb or a postcode", () => {
    const errors = validateEnquiry({ type: "out_of_area", name: "Lee", email: "lee@example.com" });
    expect(errors.suburb).toBe("Enter your suburb or postcode so we know where you are.");
    expect(validateEnquiry({ type: "out_of_area", name: "Lee", email: "lee@example.com", postcode: "6000" })).toEqual({});
    expect(validateEnquiry({ type: "out_of_area", name: "Lee", email: "lee@example.com", suburb: "Perth" })).toEqual({});
  });
});

describe("toEnquiryPayload", () => {
  it("keeps only collected fields, trims, drops blanks, coerces fleet_size and normalises the plate", () => {
    expect(
      toEnquiryPayload({
        type: "fleet",
        name: "  Pat ",
        email: "pat@acme.example",
        phone: "",
        company: "Acme",
        fleet_size: "42",
        rego: "abc 123",
        website: "",
        // @ts-expect-error a stray field must never be forwarded
        role: "admin",
      }),
    ).toEqual({ type: "fleet", name: "Pat", email: "pat@acme.example", company: "Acme", fleet_size: 42, rego: "ABC123", website: "" });
  });

  it("passes a filled honeypot through untouched so the API can discard it", () => {
    expect(toEnquiryPayload({ ...base, website: "http://spam.example" }).website).toBe("http://spam.example");
  });
});

describe("helpers", () => {
  it("normalises plates like the API (spaces and dashes stripped, upper-cased)", () => {
    expect(normaliseRego("ab-12 cd")).toBe("AB12CD");
  });
  it("finds the first error in form order", () => {
    expect(firstErrorField({ email: "x", name: "y" }, ["name", "email"])).toBe("name");
    expect(firstErrorField({}, ["name"])).toBeNull();
  });
});
