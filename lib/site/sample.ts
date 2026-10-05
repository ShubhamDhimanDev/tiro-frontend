/**
 * Design-phase switch for SAMPLE content (PLAN-v2 phases 5-6). When on, the
 * content pages fall back to clearly marked sample data if the API has
 * nothing. OFF by default since Phase 7 (live API): pages show real data or a
 * proper empty state. Opt in locally with `SAMPLE_CONTENT=on` for layout work.
 */
export const SAMPLE_CONTENT_ENABLED = process.env.SAMPLE_CONTENT === "on";

/** Footnote shown under any section that is rendering sample data. */
export const SAMPLE_NOTE = "Sample content for layout review. Live data is connected in a later phase.";
