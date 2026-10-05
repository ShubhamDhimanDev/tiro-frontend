import type { ContentImageKey } from "@/lib/site/content-images";

/**
 * Copy for the static "information" pages (design v2 phase 5): price
 * guarantee, payment options, delivery promise, warranties, about us, how it
 * works, our range and fleet. Original Tiro wording.
 *
 * MOCK / UNCONFIRMED: no figure, fee, time limit or guarantee length below is
 * a confirmed business term. Each page is deliberately free of numbers; the
 * TODO(client) notes mark where real terms go before launch. Rendered by
 * `components/page/info-page.tsx`.
 */
export type InfoIconKey =
  | "shield"
  | "tag"
  | "card"
  | "clock"
  | "truck"
  | "return"
  | "users"
  | "book"
  | "gauge"
  | "gift"
  | "wrench"
  | "tyre"
  | "building"
  | "help"
  | "pin"
  | "recycle"
  | "calendar"
  | "star";

export type InfoSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  image: ContentImageKey;
  icon?: InfoIconKey;
  cta?: { href: string; label: string };
};

export type InfoPageContent = {
  slug: string;
  path: string;
  /** Used for the document title and breadcrumb. */
  title: string;
  /** H1 text. */
  heading: string;
  description: string;
  lead: string;
  eyebrow?: string;
  sections: InfoSection[];
  faqs: { question: string; answer: string }[];
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  /** Parent crumb (defaults to Home only). */
  parent?: { name: string; url: string };
};

export const INFO_PAGES = {
  "price-guarantee": {
    slug: "price-guarantee",
    path: "/price-guarantee",
    title: "Price guarantee",
    heading: "Our price guarantee",
    description:
      "Found the same tyre cheaper with fitting included? Tell us and we will review it. How the Tiro price guarantee works and how to make a claim.",
    lead: "Convenience should not cost extra. If you find the same tyre advertised for less with fitting at your home or work, send us the details and we will look at matching it.",
    eyebrow: "Offers",
    parent: { name: "Offers", url: "/deals" },
    primaryCta: { href: "/price-guarantee-claims/new", label: "Make a claim" },
    secondaryCta: { href: "/price-guarantee-claims", label: "My claims" },
    sections: [
      {
        id: "what-it-covers",
        heading: "What it covers",
        icon: "shield",
        image: "offers-price-guarantee",
        paragraphs: [
          "We compare like with like: the same tyre, the same size, advertised with onsite fitting included, at an Australian business that can actually fit it for you.",
          "If your claim checks out we apply the difference to your order, so you keep the convenience of a van at your door.",
        ],
        bullets: ["Same brand, pattern and size", "Fitting included in the other price", "A link we can check"],
      },
      {
        id: "how-to-claim",
        heading: "How to make a claim",
        icon: "tag",
        image: "offers-latest",
        paragraphs: [
          "Sign in, open the tyre you are buying and choose price match, or start from your order. Paste the link and the price you found and tell us which tyre it is.",
          "Our team reviews each claim and replies by email. You can follow the status of every claim under My claims.",
        ],
        cta: { href: "/price-guarantee-claims/new", label: "Start a claim" },
      },
    ],
    faqs: [
      {
        question: "Do I need an account to make a claim?",
        answer: "Yes. Claims are tied to your account so we can find your order and reply to you.",
      },
      {
        question: "Does it apply to tyres I have already bought?",
        answer: "You can claim from an order and from a tyre page before you buy. Check the terms on your offer for any time limits.",
      },
      {
        question: "What happens if my claim is not approved?",
        answer: "We tell you why. The reason is shown on the claim, and you can reply to us if you have more detail.",
      },
    ],
  },
  "payment-options": {
    slug: "payment-options",
    path: "/payment-options",
    title: "Payment options",
    heading: "Ways to pay",
    description: "Pay by card, pay over time, or pay when we arrive. The payment options available at Tiro Mobile Tyres checkout.",
    lead: "Choose what suits you at checkout: card, pay later, or pay on the day. You see the full price, with GST, before you commit.",
    eyebrow: "Offers",
    parent: { name: "Offers", url: "/deals" },
    primaryCta: { href: "/tyres", label: "Shop tyres" },
    sections: [
      {
        id: "cards",
        heading: "Cards and wallets",
        icon: "card",
        image: "offers-payment",
        paragraphs: [
          "Pay securely online by credit or debit card. Card details are handled by our payment provider and never stored by us.",
          "Digital wallets are offered where your device supports them.",
        ],
        bullets: ["Credit and debit cards", "Apple Pay and Google Pay", "Prices shown inc. GST"],
      },
      {
        id: "pay-later",
        heading: "Pay over time",
        icon: "calendar",
        image: "offers-flexible",
        paragraphs: [
          "Split a larger purchase into instalments with a buy now, pay later provider. Eligibility and any fees are set by the provider, not by us.",
          "Availability depends on your order and is shown at the payment step.",
        ],
      },
      {
        id: "on-the-day",
        heading: "Pay when we arrive",
        icon: "truck",
        image: "offers-delivery",
        paragraphs: [
          "Prefer to wait until the job is done? Choose pay on fitting and settle with the technician by card on the day. You need to be there to pay.",
        ],
      },
    ],
    faqs: [
      { question: "When am I charged?", answer: "Online payments are taken when you place the order. Pay on fitting is taken by the technician on the day." },
      { question: "Is there a surcharge?", answer: "The total shown at checkout is the total you pay. Any provider fee for pay-later is shown before you confirm." },
    ],
  },
  "delivery-promise": {
    slug: "delivery-promise",
    path: "/delivery-promise",
    title: "Delivery promise",
    heading: "Our delivery promise",
    description: "Tyres delivered and fitted at your door. How booking times work, how we confirm your slot and what happens if plans change.",
    lead: "We bring the tyres and the tools together. You pick a day and a window, we confirm it, and the van shows up ready to fit.",
    eyebrow: "Offers",
    parent: { name: "Offers", url: "/deals" },
    primaryCta: { href: "/tyres", label: "Find tyres" },
    sections: [
      {
        id: "booking",
        heading: "A time you choose",
        icon: "clock",
        image: "offers-delivery",
        paragraphs: [
          "Available times are shown for your suburb, based on stock, the nearest depot and the van schedule. Same-day and next-day slots appear where we can offer them.",
          "Flexible bookings are quicker for us to fit in, so they are cheaper for you.",
        ],
        bullets: ["Morning, lunch and afternoon windows", "A flexible option for a small discount", "Confirmation by email and SMS"],
      },
      {
        id: "on-the-day",
        heading: "On the day",
        icon: "truck",
        image: "location-van",
        paragraphs: [
          "The technician messages when they are on the way. You do not need to be home as long as the car is accessible and we can reach the wheels.",
          "Need to move your booking? Use the link in your confirmation or call us.",
        ],
        cta: { href: "/how-it-works", label: "How it works" },
      },
    ],
    faqs: [
      { question: "How soon can you come?", answer: "It depends on stock and the van schedule in your area. The times shown after you set your suburb are the real options." },
      { question: "What if I need to change the time?", answer: "Use the manage link in your confirmation message, or call us and we will find another slot." },
    ],
  },
  warranties: {
    slug: "warranties",
    path: "/warranties",
    title: "Warranties and returns",
    heading: "Warranties and returns",
    description: "What warranty covers your new tyres and fitting, and how returns work at Tiro Mobile Tyres.",
    lead: "Your tyres carry the manufacturer warranty, our fitting is guaranteed, and your Australian Consumer Law rights are untouched. Here is the plain-language version.",
    eyebrow: "About us",
    parent: { name: "About us", url: "/about" },
    primaryCta: { href: "/contact", label: "Ask a question" },
    sections: [
      {
        id: "tyre-warranty",
        heading: "Tyre warranty",
        icon: "shield",
        image: "about-tech",
        paragraphs: [
          "Every tyre we sell comes with the manufacturer warranty for that brand. If you think a tyre is faulty, tell us. We will inspect it, and if it qualifies we lodge the claim with the manufacturer for you.",
        ],
        bullets: ["Manufacturer warranty on every tyre", "We lodge the claim for you", "Your statutory rights still apply"],
      },
      {
        id: "returns",
        heading: "Returns and exchanges",
        icon: "return",
        image: "offers-price-guarantee",
        paragraphs: [
          "Ordered the wrong size, or changed your mind before fitting? Contact us as soon as you can. Unfitted, unused tyres can usually be returned; the time limit and any callout fee are on your order confirmation.",
          "If a tyre is defective or we made the mistake, returns and replacements are on us.",
        ],
        cta: { href: "/contact", label: "Start a return" },
      },
    ],
    faqs: [
      { question: "What if a tyre goes flat soon after fitting?", answer: "Call us. We will check whether it can be repaired or whether it is covered under warranty." },
      { question: "Is the fitting guaranteed?", answer: "Yes. If something is not right with the work we did, we will come back and fix it." },
    ],
  },
  about: {
    slug: "about",
    path: "/about",
    title: "About us",
    heading: "Tyres without the trip",
    description: "Tiro Mobile Tyres brings the tyre shop to your door. Who we are, what we believe and how we work.",
    lead: "We started with a simple idea: nobody should lose half a day to a tyre shop. So we put the shop in a van and drive it to you.",
    eyebrow: "About us",
    primaryCta: { href: "/tyres", label: "Find tyres" },
    secondaryCta: { href: "/how-it-works", label: "How it works" },
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        icon: "users",
        image: "about-team",
        paragraphs: [
          "Tiro Mobile Tyres is an Australian mobile tyre fitting service. Our technicians are trained fitters who carry the equipment, the valves and the know-how to do the job properly on your driveway or at your workplace.",
          "We sell a wide range of brands so you can choose on budget, not on what a single shop happens to stock.",
        ],
      },
      {
        id: "how-we-work",
        heading: "How we work",
        icon: "wrench",
        image: "about-van",
        paragraphs: [
          "Every van carries a tyre changer, a balancer and the tools to fit, balance and check your wheels. The price you see includes fitting, balancing, new valves and taking your old tyres away for recycling.",
        ],
        bullets: ["Fitting, balancing and valves included", "Old tyres taken away and recycled", "Clear price, with GST, up front"],
      },
      {
        id: "what-we-believe",
        heading: "What we believe",
        icon: "star",
        image: "about-hero",
        paragraphs: [
          "Honest advice, a fair price and a technician who turns up when you were told. We would rather tell you your tyres have life left than sell you a set you do not need.",
        ],
        cta: { href: "/reviews", label: "Read customer reviews" },
      },
    ],
    faqs: [
      { question: "Where do you operate?", answer: "We cover a growing list of cities and suburbs. Enter your suburb on the locations page to check." },
      { question: "Are your technicians qualified?", answer: "Yes. Our fitters are trained and work to the tyre manufacturers' fitting standards." },
    ],
  },
  "how-it-works": {
    slug: "how-it-works",
    path: "/how-it-works",
    title: "How it works",
    heading: "How it works",
    description: "Choose your tyres, pick a time, and we come to you. A three-step guide to mobile tyre fitting with Tiro.",
    lead: "Three steps from worn tyres to a fitted set. No waiting room, no trip, no half-day off work.",
    eyebrow: "About us",
    parent: { name: "About us", url: "/about" },
    primaryCta: { href: "/tyres", label: "Search tyres" },
    sections: [
      {
        id: "select",
        heading: "1. Select your tyres",
        icon: "tyre",
        image: "how-1",
        paragraphs: [
          "Search by size or by vehicle, compare good, better and best options, and see one price that already includes fitting. Not sure of your size? It is printed on the sidewall of your current tyres.",
        ],
        cta: { href: "/tyres", label: "Search tyres" },
      },
      {
        id: "book",
        heading: "2. Book a time",
        icon: "calendar",
        image: "how-2",
        paragraphs: [
          "Enter where the car will be, then choose a day and a window that works. Pick flexible and we take a little off the fitting price.",
        ],
        bullets: ["Home, work or anywhere safe and level", "Morning, lunch, afternoon or flexible"],
      },
      {
        id: "we-come",
        heading: "3. We come to you",
        icon: "truck",
        image: "how-3",
        paragraphs: [
          "The van arrives, the technician fits and balances your new tyres and takes the old ones away. You get a message when they are on the way and a receipt when they are done.",
        ],
      },
    ],
    faqs: [
      { question: "How long does a fitting take?", answer: "Most sets are done in about an hour. The technician will give you a clearer idea on the day." },
      { question: "Do I need to be there?", answer: "Not necessarily. As long as the car is accessible, we can complete the job without you." },
      { question: "What do I need to prepare?", answer: "Have your wheel lock key to hand if you have one, and leave room around the car." },
    ],
  },
  "our-range": {
    slug: "our-range",
    path: "/about/our-range",
    title: "Our range",
    heading: "Our tyre range",
    description: "Premium, mid-range and budget tyres from leading brands, all fitted at your door.",
    lead: "From top-tier brands to honest budget tyres, every option is shown with one fitted price so you can compare like with like.",
    eyebrow: "About us",
    parent: { name: "About us", url: "/about" },
    primaryCta: { href: "/brands", label: "Browse brands" },
    secondaryCta: { href: "/tyres", label: "Search tyres" },
    sections: [
      {
        id: "premium",
        heading: "Premium",
        icon: "star",
        image: "range-premium",
        paragraphs: [
          "Leading global brands with the most advanced compounds and the longest development behind them. Best grip, noise and wear for drivers who want the best.",
        ],
        cta: { href: "/tyres?tier=premium", label: "Shop premium" },
      },
      {
        id: "mid-range",
        heading: "Mid-range",
        icon: "tyre",
        image: "range-mid",
        paragraphs: ["Well-known brands that balance performance and price. A sensible choice for most daily drivers."],
        cta: { href: "/tyres?tier=mid", label: "Shop mid-range" },
      },
      {
        id: "budget",
        heading: "Budget",
        icon: "tag",
        image: "range-budget",
        paragraphs: ["Reliable, fully compliant tyres at a lower price. Good for older cars, second cars and tight budgets."],
        cta: { href: "/tyres?tier=budget", label: "Shop budget" },
      },
    ],
    faqs: [
      { question: "Which tier should I choose?", answer: "Premium for the best grip and longevity, mid-range for balance, budget for the lowest price. All are fully compliant for road use." },
      { question: "Are all brands available in my size?", answer: "Stock varies by size and area. Search your size to see exactly what we can fit for you." },
    ],
  },
  fleet: {
    slug: "fleet",
    path: "/fleet",
    title: "Fleet",
    heading: "Fleet tyre servicing",
    description: "Tyre fitting, repairs and inspections for business fleets, at your depot or worksite. Tell us about your vehicles.",
    lead: "Keep vans, utes and work vehicles earning. We fit, repair and inspect at your depot or worksite so nothing sits in a queue at a tyre shop.",
    eyebrow: "Fleet",
    primaryCta: { href: "/contact?type=fleet", label: "Talk to us about your fleet" },
    secondaryCta: { href: "/tyres", label: "Search tyres" },
    sections: [
      {
        id: "on-site",
        heading: "We come to your depot",
        icon: "building",
        image: "fleet-depot",
        paragraphs: [
          "Book several vehicles in one visit. Our technicians work around your shifts, fit and balance on site, and take the old tyres away.",
        ],
        bullets: ["Depot, yard or worksite", "Multiple vehicles per visit", "Out-of-hours by arrangement"],
      },
      {
        id: "one-contact",
        heading: "One point of contact",
        icon: "users",
        image: "fleet-manager",
        paragraphs: [
          "A single contact for quotes, scheduling and invoices, plus tyre advice for each type of vehicle you run.",
        ],
        bullets: ["Quotes for the whole fleet", "Rotations, repairs and inspections", "Records of work per vehicle"],
      },
    ],
    faqs: [
      { question: "How big does a fleet need to be?", answer: "Any size. Whether you run three vans or three hundred, tell us what you have and we will reply with options." },
      { question: "Can you quote for specific tyres?", answer: "Yes. Send the sizes and brands you prefer, or ask us to recommend by vehicle." },
    ],
  },
} satisfies Record<string, InfoPageContent>;

export type InfoPageKey = keyof typeof INFO_PAGES;
