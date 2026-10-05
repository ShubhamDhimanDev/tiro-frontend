/**
 * Static copy for the /services pages. Deliberately free of prices, fees and
 * turnaround promises: those are unconfirmed and live in the booking flow.
 * Phase 6 replaces this with fully designed pages.
 */
export type ServiceContent = {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  points: string[];
  cta: { href: string; label: string };
  faqs: { question: string; answer: string }[];
};

export const SERVICE_CONTENT: ServiceContent[] = [
  {
    slug: "tyre-sales",
    title: "Tyre sales",
    summary: "Search by size, vehicle or brand and buy online with fitting included.",
    intro:
      "Choose from the brands we stock, compare good, better and best options for your car, and check out online. Your tyres are fitted where you are, so there is nothing to drop off or collect.",
    points: [
      "Search by tyre size, by vehicle, by brand or by tyre type.",
      "Prices and stock are shown for your suburb once you set your location.",
      "Price-match claims are handled online.",
    ],
    cta: { href: "/tyres", label: "Shop tyres" },
    faqs: [
      {
        question: "How do I find the right tyre size?",
        answer:
          "The size is printed on the sidewall of your current tyres (for example 205/55 R16). You can also search by your vehicle and we will suggest the fitments for it.",
      },
      {
        question: "Do I need to be home for the fitting?",
        answer: "You choose the time and place when you book. We fit at your home, workplace or another convenient spot in our coverage area.",
      },
    ],
  },
  {
    slug: "onsite-fitting",
    title: "Onsite fitting",
    summary: "A technician brings the equipment to your driveway, workplace or car park.",
    intro:
      "Book a time that suits you and we come to you with the tools to remove your old tyres, fit and balance the new ones, and send you on your way.",
    points: [
      "Pick a time slot when you book online.",
      "Fitting and balancing done at your location.",
      "Works for driveways, workplaces and roadside pickups within our coverage area.",
    ],
    cta: { href: "/booking", label: "Book a fitting" },
    faqs: [
      {
        question: "Where do you fit tyres?",
        answer: "Anywhere within our coverage area that has safe, level space for the technician to work. Check your suburb to confirm we cover it.",
      },
    ],
  },
  {
    slug: "puncture-repair",
    title: "Puncture repair",
    summary: "Slow leak or flat? We assess the tyre and repair it where it is safe to do so.",
    intro:
      "Not every puncture can be repaired safely. Our technician checks the tyre, repairs it when it meets safety standards, and recommends a replacement when it does not.",
    points: [
      "Assessment of the puncture location and tyre condition.",
      "Repair when the damage is repairable; replacement advice when it is not.",
      "Call us if you are unsure and we will point you to the right booking.",
    ],
    cta: { href: "/contact", label: "Ask about a repair" },
    faqs: [
      {
        question: "Can every puncture be repaired?",
        answer:
          "No. Damage to the sidewall or shoulder, or a puncture that is too large, means the tyre needs replacing. The technician will explain what they find.",
      },
    ],
  },
  {
    slug: "rotation-balancing",
    title: "Rotation & balancing",
    summary: "Even out wear and smooth out vibration to get more life from your tyres.",
    intro:
      "Regular rotation spreads wear across all four tyres, and balancing removes the wheel shake that shows up at highway speed.",
    points: [
      "Rotation to even out tread wear.",
      "Wheel balancing to remove vibration.",
      "Good to combine with a new set or a tyre inspection.",
    ],
    cta: { href: "/booking", label: "Book a visit" },
    faqs: [
      {
        question: "How often should tyres be rotated?",
        answer: "Your vehicle handbook or tyre brand gives the interval for your car. Our guides section covers the general rules of thumb.",
      },
    ],
  },
  {
    slug: "inspections",
    title: "Tyre inspections",
    summary: "A quick check of tread depth, pressure, age and damage.",
    intro:
      "An inspection tells you whether your tyres are safe and how much life is left, so you can plan a replacement rather than react to one.",
    points: [
      "Tread depth and wear pattern check.",
      "Pressure check and sidewall damage check.",
      "Written advice on what to do next.",
    ],
    cta: { href: "/booking", label: "Book an inspection" },
    faqs: [
      {
        question: "What tread depth is legal?",
        answer: "Rules differ between states. Our guides and help centre cover the details, and the technician can measure yours on the day.",
      },
    ],
  },
  {
    slug: "recycling",
    title: "Tyre recycling",
    summary: "Your old tyres are taken away when we fit the new ones.",
    intro:
      "Old tyres do not need to sit in your garage. We take them away with us so that they can be disposed of responsibly.",
    points: [
      "Old tyres removed at the time of fitting.",
      "No separate trip to a drop-off point.",
      "Ask us when you book if you need to keep the old tyres.",
    ],
    cta: { href: "/booking", label: "Book a fitting" },
    faqs: [
      {
        question: "Can I keep my old tyres?",
        answer: "Yes. Tell the technician on the day, or mention it when you book.",
      },
    ],
  },
  {
    slug: "fleet",
    title: "Fleet",
    summary: "Tyre fitting for business vehicles, at your depot or worksite.",
    intro:
      "Keep vans, utes and work vehicles on the road without taking them out of service for a shop visit. Tell us about your fleet and we will get back to you.",
    points: [
      "Fitting at your depot, yard or worksite.",
      "Repairs, rotations and inspections across multiple vehicles.",
      "One point of contact for your account.",
    ],
    cta: { href: "/contact?type=fleet", label: "Talk to us about your fleet" },
    faqs: [
      {
        question: "How do I set up a fleet account?",
        answer: "Get in touch with your fleet size and location and we will reply with next steps.",
      },
    ],
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICE_CONTENT.find((s) => s.slug === slug);
}
