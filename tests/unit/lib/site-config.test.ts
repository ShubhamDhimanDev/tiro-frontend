import { describe, expect, it } from "vitest";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF, WHATSAPP_NUMBER, phoneToTel, whatsappHref } from "@/lib/site/config";

describe("site config", () => {
  it("defaults to the unconfirmed public number in display and tel: form", () => {
    expect(PHONE_DISPLAY).toBe("0434 762 864");
    expect(PHONE_HREF).toBe("tel:+61434762864");
    expect(HOURS_LINE.length).toBeGreaterThan(0);
  });

  it("converts Australian display numbers to E.164 tel links", () => {
    expect(phoneToTel("1300 123 456")).toBe("tel:+611300123456");
    expect(phoneToTel("+61 2 1234 5678")).toBe("tel:+61212345678");
  });

  it("has no WhatsApp number by default, so the top bar hides the button", () => {
    expect(WHATSAPP_NUMBER).toBe("");
    expect(whatsappHref()).toBeNull();
    expect(whatsappHref("  ")).toBeNull();
  });

  it("builds a wa.me link from digits only, reading a leading 0 as Australian", () => {
    expect(whatsappHref("0412 345 678")).toBe("https://wa.me/61412345678");
    expect(whatsappHref("+61 412 345 678")).toBe("https://wa.me/61412345678");
    expect(whatsappHref("61412345678")).toBe("https://wa.me/61412345678");
  });
});
