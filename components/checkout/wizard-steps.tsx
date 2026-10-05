"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { CartTotalsSummary } from "@/components/cart/cart-totals";
import { AddressStep } from "@/components/checkout/address-step";
import { FittingDateStrip, FittingLocationStrip } from "@/components/checkout/fitting-date-strip";
import { PayPalPaymentStep } from "@/components/checkout/paypal-payment-step";
import { PaymentUnavailable } from "@/components/checkout/payment-unavailable";
import { StripePaymentStep } from "@/components/checkout/stripe-payment-step";
import { TyreImage } from "@/components/catalog/tyre-image";
import { cx } from "@/components/ui/cx";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ServiceError } from "@/components/ui/service-error";
import { LockIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/catalog/format-money";
import { splitTyreLabel } from "@/lib/cart/label";
import { rowPrice } from "@/lib/cart/live-lines";
import type { CartItem } from "@/lib/cart/cart";
import type { CartCalculateData } from "@/lib/cart/types";
import { AU_STATES } from "@/lib/checkout/au-states";
import type { FittingSelection } from "@/lib/checkout/fitting-selection";
import { describeHold } from "@/lib/checkout/slots";
import { WHEELS, requiredWheels, type DetailsErrors, type WheelKey, type WizardDetails, type WizardVehicle } from "@/lib/checkout/wizard";
import { customerVehicleDisplayLabel } from "@/lib/customer-vehicles/display";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";
import type { CustomerVehicleRecord } from "@/lib/customer-vehicles/types";
import type { BookingRecord } from "@/lib/booking/types";
import type { OrderAddressInput, OrderCreateRecord } from "@/lib/orders/types";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/** Step 1: location strip, week strip and the real times for the chosen day. The wizard shell owns the selection. */
export function StepDate({
  fitting,
  onChange,
  error,
  errorAction,
  onRetry,
  stripKey,
}: {
  fitting: FittingSelection | null;
  onChange: (next: FittingSelection | null) => void;
  error: string | null;
  /** Optional recovery control shown with the error (for example "Remove the code and continue"). */
  errorAction?: ReactNode;
  /** Present when `error` is a service failure (5xx / network): renders Retry + call-us instead of a plain message. */
  onRetry?: () => void;
  /** Changing this remounts the strip, which refetches availability (after a slot was lost). */
  stripKey: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <FittingLocationStrip />
      <FittingDateStrip key={stripKey} value={fitting} onChange={onChange} idPrefix="wizard" />
      {error && onRetry && (
        <div data-error-focus="true" tabIndex={-1} className="outline-none">
          <ServiceError message={error} onRetry={onRetry} />
        </div>
      )}
      {error && !onRetry && (
        <div role="alert" data-error-focus="true" tabIndex={-1} className="msg-error msg-error-box text-sm outline-none">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p>{error}</p>
            {errorAction}
          </div>
        </div>
      )}
    </div>
  );
}

/** Held-time card shared by steps 2 and 4. */
function HeldTimeCard({ hold, onEdit }: { hold: BookingRecord; onEdit?: () => void }) {
  const { day, time } = describeHold(hold);
  return (
    <div className="flex items-start justify-between gap-3 rounded-control bg-band p-4 text-sm">
      <div>
        <p className="font-bold text-black">Fitting date &amp; time</p>
        <p data-testid="held-time" className="text-muted">
          {day}, {time}
        </p>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="-mr-2 inline-flex min-h-11 shrink-0 items-center px-2 font-medium text-black underline underline-offset-2">
          Edit
        </button>
      )}
    </div>
  );
}

/** Step 2: who we are fitting for and where. The address is matched to a real suburb we serve. */
export function StepDetails({
  hold,
  details,
  errors,
  onChange,
  onEditDate,
  onAddress,
  onAddressLabel,
  onAddressResolving,
  savedAddresses,
  showAddressErrors,
}: {
  hold: BookingRecord;
  details: WizardDetails;
  errors: DetailsErrors;
  onChange: (next: WizardDetails) => void;
  onEditDate: () => void;
  onAddress: (address: OrderAddressInput | null) => void;
  onAddressLabel: (label: string | null) => void;
  /** Reports whether the address-to-suburb lookup is in flight. Optional. */
  onAddressResolving?: (resolving: boolean) => void;
  savedAddresses: CustomerAddressRecord[];
  showAddressErrors: boolean;
}) {
  const set = (patch: Partial<WizardDetails>) => onChange({ ...details, ...patch });
  return (
    <div className="flex flex-col gap-5">
      <HeldTimeCard hold={hold} onEdit={onEditDate} />

      <h3 className="text-base font-extrabold text-black">Your information</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="First name" required autoComplete="given-name" value={details.firstName} onChange={(e) => set({ firstName: e.target.value })} error={errors.firstName} />
        <Input label="Last name" required autoComplete="family-name" value={details.lastName} onChange={(e) => set({ lastName: e.target.value })} error={errors.lastName} />
        <Input
          label="Mobile phone number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0412 345 678"
          value={details.mobile}
          onChange={(e) => set({ mobile: e.target.value })}
          error={errors.mobile}
        />
        <Input label="Email address" required type="email" autoComplete="email" value={details.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} />
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-black">
        <input type="checkbox" checked={details.newsletter} onChange={(e) => set({ newsletter: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-green" />
        Sign me up to receive email updates and news (optional)
      </label>

      <h3 className="text-base font-extrabold text-black">Tyre fitting address</h3>
      <AddressStep
        onChange={onAddress}
        onLabelChange={onAddressLabel}
        onResolvingChange={onAddressResolving}
        savedAddresses={savedAddresses}
        showErrors={showAddressErrors}
        matchError={showAddressErrors ? errors.address : undefined}
      />
      <p className="text-sm text-muted">
        Outside our service area? Check the suburb above, or{" "}
        <Link href="/contact" className="font-bold text-black underline underline-offset-2">
          contact us
        </Link>{" "}
        to talk about options.
      </p>
    </div>
  );
}

/** Step 3: tyres in the order, vehicle details, instructions, and which wheels. */
export function StepTyres({
  items,
  vehicle,
  onChange,
  wheelsError,
  savedVehicles,
}: {
  items: CartItem[];
  vehicle: WizardVehicle;
  onChange: (next: WizardVehicle) => void;
  wheelsError: string | null;
  savedVehicles: CustomerVehicleRecord[];
}) {
  const set = (patch: Partial<WizardVehicle>) => onChange({ ...vehicle, ...patch });
  const total = items.reduce((n, it) => n + it.quantity, 0);
  const required = requiredWheels(total);

  function toggleWheel(key: WheelKey) {
    const has = vehicle.wheels.includes(key);
    set({ wheels: has ? vehicle.wheels.filter((w) => w !== key) : [...vehicle.wheels, key] });
  }

  function pickSaved(value: string) {
    if (value === "manual") {
      set({ rego: "", state: "", vehicleId: null });
      return;
    }
    const saved = savedVehicles.find((v) => v.id === Number(value));
    if (saved) set({ rego: saved.rego ?? "", state: saved.state ?? "", vehicleId: saved.vehicle_id ?? null });
  }

  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Tyres in your order" className="flex flex-col divide-y divide-line rounded-control border border-line">
        {items.map((item) => {
          const { name, size } = splitTyreLabel(item.label);
          return (
            <li key={`${item.tyre_variant_id}::${item.position}`} className="flex items-center gap-3 p-3">
              <TyreImage src={item.image} alt="" sizes="56px" className="h-14 w-14 shrink-0 rounded-control" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-black">{name}</p>
                {size && <p className="text-xs text-muted">{size}</p>}
              </div>
              <p className="text-sm text-muted">x{item.quantity}</p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-4">
        <h3 className="text-base font-extrabold text-black">Vehicle details</h3>
        {savedVehicles.length > 0 && (
          <Select label="Use a saved vehicle" value={vehicle.vehicleId ? String(savedVehicles.find((v) => v.vehicle_id === vehicle.vehicleId)?.id ?? "manual") : "manual"} onChange={(e) => pickSaved(e.target.value)}>
            <option value="manual">Enter vehicle details</option>
            {savedVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {customerVehicleDisplayLabel(v)}
              </option>
            ))}
          </Select>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Rego" autoCapitalize="characters" autoComplete="off" maxLength={20} value={vehicle.rego} onChange={(e) => set({ rego: e.target.value.toUpperCase() })} className="uppercase" />
          <Select label="State" value={vehicle.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="">Select</option>
            {AU_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input label="Colour" value={vehicle.colour} onChange={(e) => set({ colour: e.target.value })} />
          <Input label="Make" value={vehicle.make} onChange={(e) => set({ make: e.target.value })} />
          <Input label="Model" fieldClassName="md:col-span-2" value={vehicle.model} onChange={(e) => set({ model: e.target.value })} />
        </div>
        <Textarea
          label="Special instructions (optional)"
          placeholder="Tell us anything we might need to know about doing this job"
          value={vehicle.instructions}
          maxLength={500}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </div>

      <fieldset className="flex flex-col gap-3" aria-describedby="wheels-help">
        <legend className="text-base font-extrabold text-black">Which tyres are being replaced?</legend>
        <p id="wheels-help" className="text-sm text-muted">
          Tell our technician which tyres to replace. Please select {required} {required === 1 ? "tyre" : "tyres"} below.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WHEELS.map((w) => {
            const on = vehicle.wheels.includes(w.key);
            return (
              <label
                key={w.key}
                className={cx(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border-2 px-3 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black",
                  on ? "border-black bg-gold" : "border-line bg-surface hover:border-black",
                )}
              >
                <input type="checkbox" checked={on} onChange={() => toggleWheel(w.key)} className="h-5 w-5 shrink-0 accent-black" />
                {w.label}
              </label>
            );
          })}
        </div>
        {wheelsError && (
          <p role="alert" data-error-focus="true" tabIndex={-1} className="msg-error msg-error-box text-sm outline-none">
            {wheelsError}
          </p>
        )}
      </fieldset>
    </div>
  );
}

/**
 * Step 4: the summary from the held booking (`cart/calculate` mode 2, so it
 * matches what the order charges), then secure payment.
 *
 * Pressing "Place order and pay" creates the order, which creates the payment
 * with the active gateway. The gateway's own element (Stripe Payment Element
 * or PayPal buttons) then renders here: card details are entered into the
 * provider's fields and never touch our code. When the gateway is not
 * configured the order is saved and the customer is told to call.
 */
export function StepPayment({
  items,
  hold,
  summary,
  summaryError,
  onRetrySummary,
  order,
  submitError,
  paymentError,
  onPaid,
  onPaymentError,
}: {
  items: CartItem[];
  hold: BookingRecord;
  summary: CartCalculateData | null;
  summaryError: string | null;
  onRetrySummary?: () => void;
  order: OrderCreateRecord | null;
  submitError: string | null;
  paymentError: string | null;
  onPaid: (orderId: number) => void;
  onPaymentError: (message: string) => void;
}) {
  const paymentErrorRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col gap-6">
      <HeldTimeCard hold={hold} />

      <section aria-labelledby="wizard-summary" className="flex flex-col gap-4 rounded-card border border-line p-4">
        <h3 id="wizard-summary" className="text-base font-extrabold text-black">
          Summary of purchase
        </h3>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => {
            const { name, size } = splitTyreLabel(item.label);
            const price = rowPrice(summary?.lines, item);
            return (
              <li key={`${item.tyre_variant_id}::${item.position}`} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-black">
                    {item.quantity} x {name}
                  </span>
                  {size && <span className="text-xs text-muted">{size}</span>}
                </span>
                <span className="type-mono shrink-0 font-bold text-black">{price ? formatMoney(price.total) : ""}</span>
              </li>
            );
          })}
        </ul>
        {summary ? (
          <div data-testid="wizard-summary-totals">
            <CartTotalsSummary
              totals={summary}
              appliedPromotions={summary.applied_promotions}
              discountLines={summary.discount_lines}
              flexibleDiscount={summary.flexible_discount}
              hideHeading
            />
          </div>
        ) : summaryError ? (
          <ServiceError message={summaryError} onRetry={onRetrySummary} />
        ) : (
          <div className="h-32 animate-pulse rounded-control bg-chip" aria-hidden />
        )}
      </section>

      {!order && (
        <div className="flex flex-col gap-3 text-sm text-muted">
          <p className="flex items-start gap-2">
            <LockIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You pay securely by card, Apple Pay or Google Pay through our payment provider on the next step. Your time stays held while
              you pay, and Tiro never sees or stores your card details.
            </span>
          </p>
          <p>
            By placing your order you agree to our{" "}
            <Link href="/pages/terms-conditions" className="font-semibold text-black underline underline-offset-2 hover:text-ink">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/pages/privacy-policy" className="font-semibold text-black underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      )}

      {submitError && (
        <div role="alert" data-error-focus="true" tabIndex={-1} className="msg-error msg-error-box outline-none">
          <div className="min-w-0">
            <p className="font-bold">We couldn&apos;t place your order</p>
            <p className="mt-1 font-normal text-ink">{submitError}</p>
            <p className="mt-1 text-sm font-normal text-muted">
              Check your details and try again, or call us on{" "}
              <a href={PHONE_HREF} className="inline-flex min-h-11 items-center font-semibold text-black underline underline-offset-2">
                {PHONE_DISPLAY}
              </a>{" "}
              ({HOURS_LINE}).
            </p>
          </div>
        </div>
      )}

      {order && (
        <section aria-labelledby="wizard-pay" className="flex flex-col gap-4" data-testid="wizard-payment">
          <h3 id="wizard-pay" className="text-base font-extrabold text-black">
            Pay securely
          </h3>
          <p className="text-sm text-muted">
            Order <span className="font-mono font-semibold text-ink">{order.order_number}</span> is saved. Pay below to confirm your appointment.
          </p>
          <PaymentForOrder order={order} onPaid={onPaid} onError={onPaymentError} />
          {paymentError && (
            <div ref={paymentErrorRef} tabIndex={-1} role="alert" data-testid="payment-error" className="msg-error msg-error-box outline-none">
              <div className="min-w-0">
                <p className="font-bold">Your payment didn&apos;t go through</p>
                <p className="mt-1 font-normal text-ink">{paymentError}</p>
                <p className="mt-1 text-sm font-normal text-muted">
                  Check the details and try again, or use a different card. Need a hand? Call{" "}
                  <a href={PHONE_HREF} className="inline-flex min-h-11 items-center font-semibold text-black underline underline-offset-2">
                    {PHONE_DISPLAY}
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** The order's own gateway decides which element renders; a missing secret/id means payments are not configured. */
function PaymentForOrder({ order, onPaid, onError }: { order: OrderCreateRecord; onPaid: (orderId: number) => void; onError: (message: string) => void }) {
  const { gateway, client_secret: clientSecret, paypal_order_id: paypalOrderId } = order.payment;
  if (gateway === "stripe" && clientSecret) {
    return (
      <StripePaymentStep
        clientSecret={clientSecret}
        orderNumber={order.order_number}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/checkout/return?order=${order.id}`}
        onConfirmed={() => onPaid(order.id)}
        onError={onError}
      />
    );
  }
  if (gateway === "paypal" && paypalOrderId) {
    return (
      <PayPalPaymentStep
        orderId={order.id}
        paypalOrderId={paypalOrderId}
        orderNumber={order.order_number}
        onConfirmed={() => onPaid(order.id)}
        onError={onError}
      />
    );
  }
  return <PaymentUnavailable orderNumber={order.order_number} />;
}
