/**
 * Single source of truth for public contact details. Header, mobile menu,
 * footer and the contact page all read from here; never hard-code the number
 * in a component.
 *
 * Override per environment with NEXT_PUBLIC_CONTACT_PHONE (display format,
 * e.g. "0434 762 864" or "1300 000 000") and NEXT_PUBLIC_CONTACT_HOURS.
 *
 * TODO(client): the number and the hours line are UNCONFIRMED. See
 * docs/redesign/PROGRESS.md open items.
 */
export const SITE_NAME = "Tiro Mobile Tyres";

export const PHONE_DISPLAY = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "0434 762 864";

/** `tel:` href. Australian numbers: drop the leading 0, prefix +61. */
export function phoneToTel(display: string): string {
  const digits = display.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("0")) return `tel:+61${digits.slice(1)}`;
  return `tel:+61${digits}`;
}

export const PHONE_HREF = phoneToTel(PHONE_DISPLAY);

/** Opening hours line shown next to the number. Unconfirmed default. */
export const HOURS_LINE = process.env.NEXT_PUBLIC_CONTACT_HOURS?.trim() || "Mon\u2013Sat 7am\u20136pm";

export const TAGLINE = "Mobile tyre fitting. We come to you.";
