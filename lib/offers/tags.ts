/** ISR tags for the offers domain. The Laravel webhook does not send these yet, so pages also revalidate on a timer. */
export const OFFERS_TAG = "offers";
export const offerDetailTag = (slug: string) => `offers:${slug}`;
/** Offers change and end on dates, so they revalidate faster than the 1h content default. */
export const OFFERS_REVALIDATE = 900;
