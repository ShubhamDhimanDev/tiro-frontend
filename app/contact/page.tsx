import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { Suspense } from "react";
import { ContactTabs } from "@/components/forms/contact-tabs";
import { OutOfAreaCapture } from "@/components/forms/out-of-area-capture";
import { HomeSection } from "@/components/home/home-section";
import { CtaBands } from "@/components/page/cta-bands";
import { IconCards } from "@/components/page/icon-cards";
import { Mark, PageHero } from "@/components/page/page-hero";
import { buttonClassName } from "@/components/ui/button";
import { PhoneIcon, PinIcon } from "@/components/ui/icons";
import { BuildingIcon, HelpIcon, MailIcon } from "@/components/ui/icons-extra";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

export const metadata: Metadata = pageMetadata({
  title: "Contact us | Tiro Mobile Tyres",
  description: "Send us a message, ask for a tyre quote, or make a fleet enquiry. Or call us and talk to a real person.",
  path: "/contact",
});

const LINKS = [
  { href: "/help", label: "Help centre" },
  { href: "/faq", label: "Frequently asked questions" },
  { href: "/booking", label: "Book a fitting" },
  { href: "/price-guarantee-claims", label: "Price-match claims" },
  { href: "/fleet", label: "About fleet services" },
];

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Contact", url: "/contact" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Contact"
        title={
          <>
            Talk to a <Mark>real person</Mark>
          </>
        }
        lead="Send us a message, ask for a quote on a tyre you cannot find, or tell us about your fleet. The quickest way is still a phone call."
        actions={
          <a href={PHONE_HREF} className={buttonClassName({ variant: "yellow" })}>
            <PhoneIcon aria-hidden="true" className="h-5 w-5" />
            {PHONE_DISPLAY}
          </a>
        }
      />

      <section aria-labelledby="ways-heading" className="container-page pt-[50px] lg:pt-20">
        <h2 id="ways-heading" className="sr-only">
          Ways to reach us
        </h2>
        <IconCards
          columns={3}
          items={[
            {
              icon: <PhoneIcon />,
              title: "Call us",
              body: (
                <>
                  <span className="whitespace-nowrap">{PHONE_DISPLAY}.</span> <span className="whitespace-nowrap">{HOURS_LINE}.</span>
                </>
              ),
            },
            { icon: <MailIcon />, title: "Send a message", body: "Use the form below and we will reply by email." },
            { icon: <BuildingIcon />, title: "Fleet enquiry", body: "Tell us about your vehicles and where they are based." },
          ]}
        />
      </section>

      <div className="container-page grid gap-8 pt-[50px] lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12 lg:pt-20">
        <section aria-labelledby="enquiry-heading" className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-rest md:p-8">
          <h2 id="enquiry-heading" className="type-h2 mb-5 !text-[28px]">
            How can we help?
          </h2>
          {/* useSearchParams needs a Suspense boundary so the page can stay static. */}
          <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-chip" aria-hidden />}>
            <ContactTabs />
          </Suspense>
        </section>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="call-heading" className="flex flex-col gap-3 rounded-card bg-ink p-6 text-white">
            <h2 id="call-heading" className="type-eyebrow font-bold uppercase text-gold">
              Call us
            </h2>
            <a href={PHONE_HREF} className="type-mono inline-flex min-h-11 items-center gap-3 text-2xl font-bold hover:text-gold">
              <PhoneIcon className="h-6 w-6 text-gold" />
              {PHONE_DISPLAY}
            </a>
            <p className="text-footer-muted">{HOURS_LINE}</p>
          </section>
          <section aria-labelledby="self-heading" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
            <h2 id="self-heading" className="type-h3">
              Looking for something else?
            </h2>
            <ul className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-11 items-center font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/tyres" className={buttonClassName({ className: "mt-2 self-start" })}>
              Shop tyres
            </Link>
          </section>
        </aside>
      </div>

      <HomeSection id="out-of-area" title="Outside our area?" className="pb-[50px] lg:pb-20">
        <div className="grid gap-6 rounded-card bg-band p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-3 text-lg font-bold text-black">
              <PinIcon aria-hidden="true" className="h-6 w-6" />
              We are adding areas all the time
            </p>
            <p className="text-muted">
              If your suburb is not on our list yet, leave your details and we will tell you the day we start fitting tyres near you. Not sure if
              you are covered? <Link href="/locations" className="inline-flex min-h-11 items-center font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4">Check the locations page</Link>.
            </p>
            <p className="flex items-center gap-2 text-sm text-muted">
              <HelpIcon aria-hidden="true" className="h-4 w-4" />
              We only use your email to tell you about your area.
            </p>
          </div>
          <OutOfAreaCapture query="" />
        </div>
      </HomeSection>
      <CtaBands />
    </>
  );
}
