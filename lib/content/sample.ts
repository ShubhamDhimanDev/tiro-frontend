import { SAMPLE_CONTENT_ENABLED } from "@/lib/site/sample";
import type { ContentPageDetail, ContentPageSummary, Faq } from "./types";

/**
 * SAMPLE blog posts, guides and FAQs for design review (original copy, no
 * claims about real prices or terms). Used only when the API returns nothing
 * for the type and `SAMPLE_CONTENT` is not `off` (lib/site/sample.ts).
 */
export const SAMPLE_FAQS: Faq[] = [
  { id: 9001, category: "booking", sort_order: 1, question: "How does mobile tyre fitting work?", answer: "Choose your tyres online, pick a day and a time window, and a technician arrives at your address with the equipment to fit and balance them. You do not need to go anywhere." },
  { id: 9002, category: "booking", sort_order: 2, question: "Do I need to be home during the fitting?", answer: "Not as long as the car is accessible and we can reach the wheels. If you have locking wheel nuts, leave the key where the technician can find it." },
  { id: 9003, category: "booking", sort_order: 3, question: "How long does a fitting take?", answer: "Most sets of four are done in about an hour. The technician can give you a clearer idea on the day." },
  { id: 9004, category: "pricing", sort_order: 4, question: "What is included in the price?", answer: "Fitting, wheel balancing, new valves and taking your old tyres away for recycling are included in the price you see." },
  { id: 9005, category: "pricing", sort_order: 5, question: "Which payment methods do you accept?", answer: "Cards and digital wallets online, pay-later options where available, and card on the day if you choose pay on fitting." },
  { id: 9006, category: "pricing", sort_order: 6, question: "Can you match a lower price?", answer: "If you find the same tyre cheaper with fitting included, send us the details through the price guarantee form and we will review it." },
  { id: 9007, category: "tyres", sort_order: 7, question: "How do I find my tyre size?", answer: "It is printed on the sidewall of your current tyres, for example 205/55 R16. You can also search by vehicle and we will suggest the fitments." },
  { id: 9008, category: "tyres", sort_order: 8, question: "Can you repair a puncture?", answer: "Often, yes. Damage to the sidewall or shoulder cannot be repaired safely, and the technician will explain what they find." },
];

type SampleArticle = ContentPageSummary & { body: string };

const article = (
  id: number,
  type: "blog_post" | "guide",
  slug: string,
  title: string,
  category: string,
  excerpt: string,
  body: string,
  daysAgo: number,
): SampleArticle => {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return { id, type, slug, title, category, excerpt, body, featured_image_path: null, meta_title: null, meta_description: null, published_at: at, updated_at: at };
};

export const SAMPLE_ARTICLES: SampleArticle[] = [
  article(9101, "blog_post", "sample-how-to-read-a-tyre-sidewall", "How to read a tyre sidewall", "advice", "The numbers on your tyre tell you the size, load and speed rating. Here is what each one means.", "<p>Every tyre carries a string of numbers and letters on its sidewall. A typical size such as 205/55 R16 91V looks cryptic, but it breaks down into five simple parts.</p><h2>Width, profile and rim</h2><p>The first number is the width in millimetres. The second is the profile, the sidewall height as a percentage of the width. The R means radial construction and the last number is the rim diameter in inches.</p><h2>Load and speed</h2><p>The two-digit number after the size is the load index and the letter is the speed rating. Always fit tyres that meet or exceed what your vehicle placard specifies.</p>", 6),
  article(9102, "blog_post", "sample-tyre-pressure-basics", "Tyre pressure basics", "safety", "Correct pressure keeps you safer and makes tyres last longer. How to check it and how often.", "<p>Pressure is the single easiest thing to check and the one most people forget. Under-inflated tyres wear faster, use more fuel and handle worse.</p><h2>Where to find the right number</h2><p>Look for the placard on the driver door jamb or in the handbook. Check when the tyres are cold, ideally once a month and before a long trip.</p>", 14),
  article(9103, "blog_post", "sample-evs-and-tyre-wear", "Why EVs can wear tyres faster", "ev", "Instant torque and extra weight mean electric vehicles are harder on tyres. What to look for.", "<p>Electric vehicles are heavier than their petrol equivalents and deliver torque instantly. Both put extra load on the tyres.</p><h2>Choosing EV tyres</h2><p>Look for tyres designed for higher loads and lower rolling resistance, and rotate them regularly to even out wear.</p>", 21),
  article(9104, "blog_post", "sample-fitting-at-the-office", "Getting your tyres fitted at the office", "company", "A van in the car park and no afternoon off. How workplace fitting works.", "<p>Workplace fitting is one of our most popular options. Book a window, leave the keys with reception if needed and carry on working while the van does the job.</p>", 30),
  article(9105, "guide", "sample-how-to-choose-tyres", "How to choose new tyres", "buying-guide", "Brand tier, tyre type and budget. A simple way to pick the right set for your car.", "<p>Start with the size your vehicle needs, then decide how much you want to spend. Premium brands lead on grip and longevity, mid-range offers a balance, and budget tyres keep cost down.</p><h2>Think about how you drive</h2><p>Mostly commuting? Comfort and low noise matter. Towing or off-road? Look at all-terrain and light truck options.</p><h2>Ask for advice</h2><p>If you are unsure, send us your vehicle and what you use it for and we will suggest a shortlist.</p>", 9),
  article(9106, "guide", "sample-when-to-replace-tyres", "When to replace your tyres", "safety", "Tread depth, age and damage. Three checks that tell you it is time.", "<p>Tyres wear out gradually, so it helps to know the signs.</p><h2>Tread depth</h2><p>Look for the tread wear indicators moulded into the grooves. When the tread is level with them, the tyre is at its legal limit.</p><h2>Age and damage</h2><p>Cracks, bulges and cuts all need attention, and old tyres harden even if the tread looks fine.</p>", 18),
  article(9107, "guide", "sample-staggered-fitment", "What is a staggered fitment?", "buying-guide", "Some performance cars run wider tyres at the back. How to tell and what it means when ordering.", "<p>A staggered fitment means the front and rear tyres are different sizes. It is common on performance and some luxury cars.</p><p>Check both axles before you order, because the sizes will not match.</p>", 40),
];

export function sampleSummaries(type: "blog_post" | "guide"): ContentPageSummary[] {
  if (!SAMPLE_CONTENT_ENABLED) return [];
  return SAMPLE_ARTICLES.filter((a) => a.type === type).map((a) => {
    const rest: Partial<SampleArticle> = { ...a };
    delete rest.body;
    return rest as ContentPageSummary;
  });
}

export function sampleDetail(type: "blog_post" | "guide", slug: string): ContentPageDetail | null {
  if (!SAMPLE_CONTENT_ENABLED) return null;
  const hit = SAMPLE_ARTICLES.find((a) => a.type === type && a.slug === slug);
  return hit ? { ...hit, og_image_path: null } : null;
}

export function sampleFaqs(): Faq[] {
  return SAMPLE_CONTENT_ENABLED ? SAMPLE_FAQS : [];
}

/**
 * SAMPLE generic pages (`/pages/{slug}`), so the footer's legal links resolve
 * while the CMS has none. Placeholder text only: NOT legal copy. Replace with
 * counsel-approved terms before launch.
 */
const SAMPLE_PAGES: Record<string, { title: string; excerpt: string; body: string }> = {
  "terms-conditions": {
    title: "Terms and conditions",
    excerpt: "The terms that apply when you buy tyres and book a fitting with us.",
    body: "<p><strong>Sample text for layout review. This is not legal copy.</strong></p><h2>Orders and fitting</h2><p>When you place an order you agree to the price shown at checkout, including GST. A technician will fit your tyres at the address and time you choose.</p><h2>Changes and cancellations</h2><p>Contact us as early as you can if you need to change or cancel a booking. Your Australian Consumer Law rights are not affected by these terms.</p><h2>Warranty</h2><p>Tyres carry the manufacturer warranty for their brand. See the warranties and returns page for how to make a claim.</p>",
  },
  "privacy-policy": {
    title: "Privacy policy",
    excerpt: "What personal information we collect, why, and how we look after it.",
    body: "<p><strong>Sample text for layout review. This is not legal copy.</strong></p><h2>What we collect</h2><p>We collect the details you give us to place an order and arrange a fitting: your name, contact details, address and vehicle information.</p><h2>How we use it</h2><p>We use it to fulfil your order, send booking messages and answer your questions. We do not sell your information.</p><h2>Your choices</h2><p>You can ask to see, correct or delete your information at any time by contacting us.</p>",
  },
  "about-us": {
    title: "About us",
    excerpt: "Tyres fitted where you are.",
    body: "<p>See our <a href=\"/about\">About us</a> page.</p>",
  },
};

export function samplePage(slug: string): ContentPageDetail | null {
  if (!SAMPLE_CONTENT_ENABLED) return null;
  const hit = SAMPLE_PAGES[slug];
  if (!hit) return null;
  const at = new Date(Date.now() - 30 * 86_400_000).toISOString();
  return {
    id: 9200,
    type: "page",
    slug,
    title: hit.title,
    excerpt: hit.excerpt,
    body: hit.body,
    featured_image_path: null,
    meta_title: null,
    meta_description: null,
    og_image_path: null,
    category: null,
    published_at: at,
    updated_at: at,
  };
}
