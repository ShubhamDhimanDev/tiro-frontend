import { FaqJsonLd } from "@/components/seo/json-ld";

/**
 * Shared/global FAQ block for the PDP. "FAQs on the PDP render from a
 * shared/global content block, not per-product data — Phase 1's PDP
 * endpoints deliberately don't return FAQ content (that's Phase 6 CMS
 * work). Use a static/placeholder FAQ block for now" (task brief; see also
 * docs/architecture/01-data-model.md's `TyreModel` note).
 *
 * Hardcoded placeholder content — replace with a fetch to the Phase 6
 * Content/FAQ module once it exists. Not per-product, so no `slug`/model
 * prop here on purpose.
 */
const PDP_FAQ_ITEMS = [
  {
    question: "How does mobile tyre fitting work?",
    answer:
      "Once you book a time, one of our technicians comes to your home, workplace, or another convenient location with the tyres already loaded, fits them on-site, and disposes of your old tyres — no trip to a store required.",
  },
  {
    question: "What's included in the price?",
    answer:
      "Every tyre we fit includes fitting, computer wheel balancing, new valves, and old tyre disposal. Some models also include a complimentary alignment check — see the Service inclusions list above for this specific tyre.",
  },
  {
    question: "How long does fitting take?",
    answer: "Most mobile fitting appointments take 30–45 minutes per axle, depending on the vehicle and tyre.",
  },
  {
    question: "What if my size isn't available in my area?",
    answer:
      "Stock varies by service zone. If a tyre isn't currently available near you, try checking a nearby suburb, or check back soon as our inventory is updated regularly.",
  },
];

export function PdpFaq() {
  return (
    <section className="flex flex-col gap-4">
      <FaqJsonLd items={PDP_FAQ_ITEMS} />
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Frequently asked questions</h2>
      <dl className="flex flex-col gap-4">
        {PDP_FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.question}</dt>
            <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
