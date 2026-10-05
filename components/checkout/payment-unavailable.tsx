import { AlertIcon, PhoneIcon } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/**
 * Shown when the order exists but the active gateway can't take payment here
 * (its public key isn't configured, or the API returned no client secret /
 * PayPal order id). Customer-facing copy only: no environment or key names.
 */
export function PaymentUnavailable({ orderNumber }: { orderNumber?: string }) {
  return (
    <div
      data-testid="payment-not-configured"
      role="status"
      className="flex flex-col gap-4 rounded-card border-[3px] border-black bg-gold-soft p-4 md:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-black">
          <AlertIcon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="type-h3">Card payment isn&apos;t available right now</h3>
          <p className="mt-1 text-muted">
            {orderNumber ? (
              <>
                We&apos;ve saved your order (<span className="font-mono font-semibold text-ink">{orderNumber}</span>) but can&apos;t take
                payment online at the moment.
              </>
            ) : (
              <>We can&apos;t take payment online at the moment.</>
            )}{" "}
            Call us and we&apos;ll finish payment with you over the phone.
          </p>
        </div>
      </div>
      <a href={PHONE_HREF} className={buttonClassName({ fullWidth: true })}>
        <PhoneIcon aria-hidden="true" className="h-5 w-5" />
        Call {PHONE_DISPLAY}
      </a>
      <p className="text-sm text-muted">{HOURS_LINE}</p>
    </div>
  );
}
