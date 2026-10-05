import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/booking-flow";

/**
 * The appointment booking flow: pick a slot, hold it, reschedule/cancel.
 * Personalized/session-bound, never indexed: the "SSR/client-rendered" row of
 * the rendering-strategy plan. Every data dependency (zone, cart, slots, the
 * hold itself) is resolved client-side inside `<BookingFlow>`, so this page
 * shell carries no server data fetching of its own.
 */
export const metadata: Metadata = {
  title: "Book a mobile fitting | Tiro Mobile Tyres",
  description: "Choose an appointment time for your mobile tyre fitting.",
  robots: { index: false, follow: false },
};

export default function BookingPage() {
  return (
    <div className="container-page flex max-w-4xl flex-col gap-6 py-6 md:py-10">
      <div>
        <h1 className="type-h2">Book your fitting</h1>
        <p className="mt-2 max-w-xl text-muted">
          We come to you. Choose a day and time that suits, and we&apos;ll hold it while you check out.
        </p>
      </div>
      <BookingFlow />
    </div>
  );
}
