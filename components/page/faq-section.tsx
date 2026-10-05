import { HomeSection } from "@/components/home/home-section";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { Accordion } from "@/components/ui/accordion";

/**
 * FAQ accordion with matching FAQPage JSON-LD. The structured data lists
 * exactly the questions rendered, so the markup and the visible page agree.
 */
export function FaqSection({
  id = "faq",
  title = "Common questions",
  items,
  className,
}: {
  id?: string;
  title?: string;
  items: { question: string; answer: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <HomeSection id={id} title={title} className={className}>
      <FaqJsonLd items={items} />
      <div className="max-w-3xl">
        <Accordion items={items.map((f, i) => ({ id: i, title: f.question, content: f.answer }))} />
      </div>
    </HomeSection>
  );
}
