/**
 * Footer trust badges (awards, accreditation, review platforms). Empty until
 * the business holds real, usable badges: add `{ label, href, src }` entries
 * (images under `public/images/badges/`). Nothing renders while the list is empty.
 */
export type TrustBadge = { label: string; href?: string; src: string };

export const TRUST_BADGES: TrustBadge[] = [];
