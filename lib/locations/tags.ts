/** ISR tags for the locations domain. The Laravel webhook does not send these yet, so pages also revalidate on a timer. */
export const LOCATIONS_TAG = "locations";
export const cityTag = (state: string, city: string) => `locations:${state}:${city}`;
