import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { HomeSection } from "@/components/home/home-section";
import { InfoPage } from "@/components/page/info-page";
import { INFO_PAGES } from "@/lib/site/info-pages";

const page = INFO_PAGES.fleet;

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.description, path: page.path });

export default function FleetPage() {
  return (
    <InfoPage
      page={page}
      extra={
        <HomeSection id="fleet-enquiry" title="Tell us about your fleet" className="pb-[50px] lg:pb-0">
          <div className="max-w-3xl rounded-card border border-line bg-surface p-5 shadow-rest md:p-8">
            <p className="mb-5 text-muted">Company, number of vehicles and where they are based. We will reply with options and a quote.</p>
            <EnquiryForm type="fleet" />
          </div>
        </HomeSection>
      }
    />
  );
}
