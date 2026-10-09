/**
 * ISR tags for the locations domain. Laravel's webhook sends `locations` when an admin changes a state or zone
 * (every location fetch carries it), so the served-area lists refresh at once; pages also revalidate on a timer.
 */
export const LOCATIONS_TAG = "locations";
export const cityTag = (state: string, city: string) => `locations:${state}:${city}`;
