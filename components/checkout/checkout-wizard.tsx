"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { useCart } from "@/components/cart/cart-provider";
import { useLivePricing } from "@/components/cart/use-live-pricing";
import { useFittingSelection } from "@/components/checkout/fitting-date-strip";
import { StepDate, StepDetails, StepPayment, StepTyres } from "@/components/checkout/wizard-steps";
import { useLocation } from "@/components/location/location-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { AlertIcon, CartIcon, ChevronLeftIcon, CloseIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { bookingApi } from "@/lib/booking/client-api";
import { clearStoredHold, readStoredHold, writeStoredHold } from "@/lib/booking/hold-storage";
import { toBookingItems } from "@/lib/cart/cart";
import { cartApi } from "@/lib/cart/client-api";
import { formatMoney } from "@/lib/catalog/format-money";
import { customerAddressesApi } from "@/lib/customer-addresses/client-api";
import { customerVehiclesApi } from "@/lib/customer-vehicles/client-api";
import { isCompleteSelection, writeFittingSelection, type FittingSelection } from "@/lib/checkout/fitting-selection";
import { ensureHold, holdBody, type HeldBooking, type IdempotencyState } from "@/lib/checkout/hold-flow";
import { focusFirstInvalid } from "@/lib/checkout/validate";
import {
  EMPTY_DETAILS,
  EMPTY_VEHICLE,
  WIZARD_STEPS,
  buildOrderInput,
  requiredWheels,
  validateDetails,
  wheelsMessage,
  type DetailsErrors,
  type WizardDetails,
  type WizardVehicle,
} from "@/lib/checkout/wizard";
import { ordersApi } from "@/lib/orders/client-api";
import { saveOrderRecap } from "@/lib/orders/recap";
import type { BookingRecord } from "@/lib/booking/types";
import type { CartCalculateData } from "@/lib/cart/types";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";
import type { CustomerVehicleRecord } from "@/lib/customer-vehicles/types";
import type { OrderAddressInput, OrderCreateRecord } from "@/lib/orders/types";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

/** A hold restored from a previous visit or a `?booking=` link: its request body is unknown until the customer continues. */
const RESUMED = "resumed";

function sameFitting(record: BookingRecord, fitting: FittingSelection): boolean {
  if (record.scheduled_date !== fitting.date) return false;
  return fitting.flexible ? Boolean(record.flexible) : !record.flexible && record.slot_start === fitting.slot;
}

function fittingFromRecord(record: BookingRecord): FittingSelection {
  return record.flexible
    ? { date: record.scheduled_date, slot: null, flexible: true }
    : { date: record.scheduled_date, slot: record.slot_start, flexible: false };
}

/**
 * 4-step checkout wizard shown as a modal over the cart page:
 * 1 Date & Time, 2 Fitting Details, 3 Select Tyres, 4 Payment.
 *
 * Fully live. Step 1 reads real availability and, on Next, creates the real
 * 15-minute booking hold (`POST /bookings`: flexible and promo code included).
 * Steps 2 and 3 capture the customer, a matched fitting address and vehicle.
 * Step 4 shows the order summary priced against the hold (`cart/calculate`
 * mode 2) and "Place order and pay" creates the order (`POST /orders`, with an
 * Idempotency-Key per attempt) and mounts the active gateway's own payment
 * element. A paid order lands on `/checkout/confirmation?order=<id>`.
 *
 * Next stays enabled (except while step 2 matches the address to a suburb, when it shows "Matching address"): pressing it with something missing shows the message
 * beside the field and moves focus there. `resumeBookingId` (from
 * `/checkout?booking=<id>`) re-opens an existing hold at step 2.
 */
export function CheckoutWizard({ resumeBookingId = null }: { resumeBookingId?: number | null }) {
  const router = useRouter();
  const { customer: authCustomer } = useAuth();
  const { state: cart, hydrated, setFlexible, setPromoCode } = useCart();
  const { zone, clearZone, pickerOpen } = useLocation();
  const { pricing } = useLivePricing();
  const [fitting, setFitting, fittingReady] = useFittingSelection();

  const [step, setStep] = useState(0);
  // Direction of the last step change (1 forward, -1 back) for the slide-in.
  const [stepNav, setStepNav] = useState({ step: 0, dir: 1 });
  if (stepNav.step !== step) setStepNav({ step, dir: step > stepNav.step ? 1 : -1 });
  const stepDirection = stepNav.dir;
  const [hold, setHold] = useState<HeldBooking | null>(null);
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdExpired, setHoldExpired] = useState(false);
  const [stripKey, setStripKey] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  // The hold request failed because the service did (5xx / network): show Retry + call-us and keep Next disabled until it is resolved.
  const [holdServiceDown, setHoldServiceDown] = useState(false);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [promoProblem, setPromoProblem] = useState(false);
  const [resumeProblem, setResumeProblem] = useState<string | null>(null);

  const [details, setDetails] = useState<WizardDetails>(EMPTY_DETAILS);
  const [address, setAddress] = useState<OrderAddressInput | null>(null);
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [addressResolving, setAddressResolving] = useState(false);
  const [vehicle, setVehicle] = useState<WizardVehicle>(EMPTY_VEHICLE);
  const [detailErrors, setDetailErrors] = useState<DetailsErrors>({});
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [wheelsError, setWheelsError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddressRecord[]>([]);
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicleRecord[]>([]);

  const [summary, setSummary] = useState<{ bookingId: number; data: CartCalculateData } | { bookingId: number; error: string } | null>(null);
  const [order, setOrder] = useState<OrderCreateRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const holdKeyRef = useRef<IdempotencyState>({ bodyKey: null, key: null });
  const orderKeyRef = useRef<IdempotencyState>({ bodyKey: null, key: null });
  const prefilled = useRef(false);

  const totalTyres = cart.items.reduce((n, it) => n + it.quantity, 0);

  // Restore a hold: from the `?booking=` link, else one this browser still has pending.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (resumeBookingId) {
        const res = await bookingApi.show(resumeBookingId);
        if (cancelled) return;
        if (res.kind === "success" && res.data.data.status === "pending_hold") {
          const record = res.data.data;
          setHold({ record, bodyKey: RESUMED });
          setFitting(fittingFromRecord(record));
          if (record.flexible) setFlexible(true);
          setStep(1);
        } else {
          setResumeProblem(
            res.kind === "success" ? "That time is no longer held. Choose a time to continue." : "We couldn't find that appointment. It may have expired. Choose a time to continue.",
          );
        }
        return;
      }
      const stored = readStoredHold();
      if (stored && stored.status === "pending_hold") setHold({ record: stored, bodyKey: RESUMED });
    });
    return () => {
      cancelled = true;
    };
    // Runs once on mount; `setFitting`/`setFlexible` are stable enough for a one-off restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeBookingId]);

  // Prefill the contact fields from the signed-in customer, once.
  useEffect(() => {
    if (!authCustomer || prefilled.current) return;
    prefilled.current = true;
    const [first, ...rest] = authCustomer.name.trim().split(/\s+/);
    queueMicrotask(() =>
      setDetails((d) => ({
        ...d,
        firstName: d.firstName || first || "",
        lastName: d.lastName || rest.join(" "),
        mobile: d.mobile || authCustomer.mobile || "",
        email: d.email || authCustomer.email,
      })),
    );
  }, [authCustomer]);

  // Saved addresses and vehicles are a convenience for signed-in customers only.
  useEffect(() => {
    if (!authCustomer) return;
    let cancelled = false;
    customerAddressesApi.list().then((r) => {
      if (!cancelled && r.kind === "success") setSavedAddresses(r.data.data);
    });
    customerVehiclesApi.list().then((r) => {
      if (!cancelled && r.kind === "success") setSavedVehicles(r.data.data);
    });
    return () => {
      cancelled = true;
    };
  }, [authCustomer]);

  // The summary on step 4 is priced against the hold itself, so it matches what the order charges.
  const holdId = hold?.record.id ?? null;
  useEffect(() => {
    if (!holdId || step < 3) return;
    let cancelled = false;
    // `summaryRetry` re-runs this effect when the customer presses Retry on a failed summary.
    cartApi.calculateBooking(holdId).then((r) => {
      if (cancelled) return;
      setSummary(r.kind === "success" ? { bookingId: holdId, data: r.data.data } : { bookingId: holdId, error: r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [holdId, step, summaryRetry]);

  // The flexible preference follows the fitting choice made on the PDP strip or here.
  const fittingFlexible = fitting ? fitting.flexible : null;
  useEffect(() => {
    if (fittingFlexible !== null) setFlexible(fittingFlexible);
  }, [fittingFlexible, setFlexible]);

  const handleAddress = useCallback((next: OrderAddressInput | null) => setAddress(next), []);
  const handleAddressResolving = useCallback((next: boolean) => setAddressResolving(next), []);
  const handleAddressLabel = useCallback((next: string | null) => setAddressLabel(next), []);

  if (hydrated === false || !fittingReady) return null;

  // Step 2 only: Next waits (visibly) for the address-to-suburb lookup instead of silently doing nothing.
  const matching = step === 1 && addressResolving;

  if (cart.items.length === 0 && !order) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <h2 className="type-h2">Your cart is empty</h2>
        <p className="mt-2 text-muted">Add tyres to your cart to choose a fitting time.</p>
        <Link href="/tyres" className={buttonClassName({ variant: "green", className: "mt-6" })}>
          Shop tyres now
        </Link>
      </div>
    );
  }

  const current = WIZARD_STEPS[step];
  const leave = () => router.push("/cart");
  const mode1 = pricing.status === "ready" ? pricing.data : null;
  const mode2 = summary && summary.bookingId === holdId && "data" in summary ? summary.data : null;
  const summaryError = summary && summary.bookingId === holdId && "error" in summary ? summary.error : null;
  const shownTotal = (step >= 3 ? (mode2 ?? mode1) : mode1)?.grand_total;
  const items = cart.items;

  function pickDate(next: FittingSelection | null) {
    setFitting(next);
    setDateError(null);
    setHoldServiceDown(false);
    setPromoProblem(false);
    setFlexible(Boolean(next?.flexible));
  }

  /** Once an error has been shown, keep it in step with what the customer types. */
  function changeDetails(next: WizardDetails) {
    setDetails(next);
    if (Object.keys(detailErrors).length > 0) setDetailErrors(validateDetails(next, address));
  }

  function changeVehicle(next: WizardVehicle) {
    setVehicle(next);
    if (wheelsError) setWheelsError(wheelsMessage(next.wheels.length, requiredWheels(totalTyres)));
  }

  function afterError() {
    window.setTimeout(() => focusFirstInvalid(bodyRef.current), 0);
  }

  async function holdSelectedTime(): Promise<boolean> {
    setHoldServiceDown(false);
    if (!zone) {
      setDateError("Set your fitting location first, so we can show and hold times for your address.");
      afterError();
      return false;
    }
    if (!isCompleteSelection(fitting)) {
      setDateError("Choose a fitting date and a time before you continue.");
      afterError();
      return false;
    }
    const body = holdBody({ zoneId: zone.zoneId, fitting, items: toBookingItems(cart), addons: cart.addons, promoCode: cart.promoCode });
    let held = hold;
    // A hold restored from before keeps its slot when the customer confirms the same choice.
    if (held?.bodyKey === RESUMED && sameFitting(held.record, fitting)) held = { ...held, bodyKey: JSON.stringify(body) };

    setHoldBusy(true);
    const result = await ensureHold({ body, current: held, idempotency: holdKeyRef.current });
    setHoldBusy(false);

    if (result.kind === "ok") {
      setHold(result.held);
      setHoldExpired(false);
      writeStoredHold(result.held.record);
      return true;
    }
    if (result.kind === "zone") {
      await clearZone();
      setDateError("We couldn't use that location. Set your fitting location again.");
    } else if (result.kind === "promo") {
      setPromoProblem(true);
      setDateError(`${result.message} Your time has not been held.`);
    } else {
      setDateError(result.message);
      if (result.kind === "error" && result.retryable) setHoldServiceDown(true);
      if (result.kind === "conflict" || result.kind === "flexible") {
        // The slot was taken (or flexible went away) while the customer chose: refetch so the strip is current.
        setFitting({ date: fitting.date, slot: null, flexible: false });
        writeFittingSelection({ date: fitting.date, slot: null, flexible: false });
        setStripKey((k) => k + 1);
      }
    }
    afterError();
    return false;
  }

  async function next() {
    if (holdBusy || submitting) return;
    if (step === 0) {
      if (!(await holdSelectedTime())) return;
    }
    if (step === 1) {
      const errors = validateDetails(details, address);
      setDetailErrors(errors);
      setShowAddressErrors(true);
      if (Object.keys(errors).length > 0) {
        afterError();
        return;
      }
    }
    if (step === 2) {
      const message = wheelsMessage(vehicle.wheels.length, requiredWheels(totalTyres));
      setWheelsError(message);
      if (message) {
        afterError();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    window.setTimeout(() => bodyRef.current?.parentElement?.scrollTo?.({ top: 0 }), 0);
  }

  function back() {
    if (step === 0) leave();
    else setStep((s) => s - 1);
  }

  function pickAnotherTime() {
    setHoldExpired(false);
    setHold(null);
    clearStoredHold();
    setStep(0);
    setStripKey((k) => k + 1);
  }

  async function placeOrder() {
    if (submitting || !hold || !address) return;
    const input = buildOrderInput({ bookingId: hold.record.id, details, address, vehicle });
    if (!input) {
      setStep(1);
      setDetailErrors(validateDetails(details, address));
      return;
    }
    const bodyKey = JSON.stringify(input);
    if (orderKeyRef.current.bodyKey !== bodyKey || !orderKeyRef.current.key) {
      orderKeyRef.current = { bodyKey, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    setSubmitError(null);
    const result = await ordersApi.create(input, orderKeyRef.current.key!);
    setSubmitting(false);

    if (result.kind === "success") {
      const created = result.data.data;
      saveOrderRecap(created.id, {
        bookingId: hold.record.id,
        address: addressLabel ?? undefined,
        tyres: cart.items.map((i) => ({ tyre_variant_id: i.tyre_variant_id, label: i.label, quantity: i.quantity, image: i.image })),
      });
      setOrder(created);
      return;
    }
    orderKeyRef.current.key = null;
    if (result.kind === "conflict") {
      setHoldExpired(true);
      return;
    }
    if (result.kind === "validation_error") {
      const e = result.errors;
      const mapped: DetailsErrors = {};
      if (e["customer.name"]) mapped.firstName = e["customer.name"].join(" ");
      if (e["customer.email"]) mapped.email = e["customer.email"].join(" ");
      if (e["customer.mobile"]) mapped.mobile = e["customer.mobile"].join(" ");
      if (e["address.suburb_id"] || e["address.line1"]) {
        mapped.address = "We couldn't match this address to a suburb we serve. Check the suburb and postcode, or call us.";
      }
      if (Object.keys(mapped).length > 0) {
        setDetailErrors(mapped);
        setShowAddressErrors(true);
        setStep(1);
        afterError();
        return;
      }
    }
    setSubmitError(result.message);
    afterError();
  }

  function paid(orderId: number) {
    router.push(`/checkout/confirmation?order=${orderId}`);
  }

  const lastStep = step === WIZARD_STEPS.length - 1;

  return (
    <Sheet
      // Hidden (not stacked) while the location picker is open; all wizard state lives here, so nothing is lost.
      open={!pickerOpen}
      onClose={leave}
      title={`Checkout, step ${step + 1} of ${WIZARD_STEPS.length}: ${current.title}`}
      dismissOnScrim={false}
      initialFocus="panel"
      bodyClassName="px-5 py-5 md:px-8"
      className="!h-dvh !max-h-dvh !rounded-none md:!h-auto md:!top-[6dvh] md:!max-h-[88dvh] md:!translate-y-0 md:!max-w-[700px] md:!rounded-sheet"
      panelTestId="checkout-wizard"
      renderHeader={({ titleId, close }) => (
        <div>
          <div className="flex items-center justify-between gap-3 bg-black px-5 py-3 text-white md:rounded-t-sheet md:px-8 md:py-4">
            <h2 id={titleId} className="min-w-0 text-lg leading-tight tracking-normal">
              <b>Step {step + 1} of {WIZARD_STEPS.length}:</b> {current.title}
            </h2>
            <div className="flex shrink-0 items-center gap-3">
              {shownTotal !== undefined && (
                <>
                  <CartIcon aria-hidden="true" className="h-6 w-6 text-gold" />
                  <span data-testid="wizard-total" className="type-mono text-lg font-extrabold">
                    {formatMoney(shownTotal)}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close checkout and return to cart"
                className="flex h-11 w-11 items-center justify-center rounded-control bg-white/15 text-white hover:bg-white/25"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-5 pt-3 md:px-8 md:pt-4">
            {/* Phones: the title already says "Step N of 4", so the 01-04 row is read by screen readers only (saves about 36px of chrome). */}
            <ol className="flex justify-between text-xl font-extrabold max-md:sr-only" aria-label="Checkout steps">
              {WIZARD_STEPS.map((s, i) => (
                <li key={s.key} aria-current={i === step ? "step" : undefined} className={cx(i <= step ? "text-black" : "text-[#8a8a8a]")}>
                  {String(i + 1).padStart(2, "0")}
                  <span className="sr-only"> {s.title}</span>
                </li>
              ))}
            </ol>
            <div className="h-1 rounded-full bg-line md:mt-2" aria-hidden="true">
              <div className="h-1 rounded-full bg-gold transition-all duration-300" style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
            </div>
            {hold && step > 0 && !holdExpired && hold.record.hold_expires_at && !order && (
              <div data-testid="wizard-hold" className="mt-2 rounded-control bg-band px-3 py-1.5 text-sm md:mt-3 md:py-2">
                <HoldCountdown expiresAt={hold.record.hold_expires_at} onExpire={() => setHoldExpired(true)} />
              </div>
            )}
          </div>
        </div>
      )}
      footer={
        holdExpired ? undefined : (
          <div className="flex items-center justify-between gap-3">
            {order ? (
              <span className="text-sm text-muted">Order saved. Complete payment above.</span>
            ) : (
              <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-black">
                <ChevronLeftIcon className="h-4 w-4" />
                {step === 0 ? "Return to cart" : "Back"}
              </button>
            )}
            {!lastStep ? (
              <Button
                variant="green"
                onClick={next}
                loading={holdBusy || matching}
                disabled={(step === 0 && holdServiceDown) || matching}
                className="min-w-32"
                data-testid="wizard-next"
              >
                {holdBusy ? "Holding time" : matching ? "Matching address" : "Next"}
              </Button>
            ) : !order ? (
              <Button variant="green" onClick={placeOrder} loading={submitting} className="min-w-44" data-testid="wizard-complete">
                {submitting ? "Placing order" : "Place order and pay"}
              </Button>
            ) : null}
          </div>
        )
      }
    >
      <div ref={bodyRef}>
        {holdExpired ? (
          <div role="alert" data-testid="hold-expired" className="flex flex-col items-start gap-4 rounded-card border-[3px] border-black bg-gold-soft p-4">
            <div>
              <h3 className="type-h3 flex items-center gap-2">
                <AlertIcon aria-hidden="true" className="h-6 w-6 shrink-0" />
                Your held time ran out
              </h3>
              <p className="mt-1 text-muted">
                We&apos;ve released it for other customers. Nothing has been charged and your tyres are still in your cart. Pick another time to
                continue.
              </p>
            </div>
            <Button variant="green" onClick={pickAnotherTime}>
              Pick another time
            </Button>
          </div>
        ) : (
          <m.div key={step} initial={{ opacity: 0, x: stepDirection * 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}>
            {resumeProblem && step === 0 && (
              <p role="status" className="mb-4 rounded-control bg-band p-3 text-sm text-black">
                {resumeProblem}
              </p>
            )}
            {step === 0 && (
              <StepDate
                fitting={fitting}
                onChange={pickDate}
                error={dateError}
                onRetry={holdServiceDown ? () => void next() : undefined}
                stripKey={stripKey}
                errorAction={
                  promoProblem ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPromoCode(null);
                        setPromoProblem(false);
                        setDateError(null);
                      }}
                    >
                      Remove the code and continue
                    </Button>
                  ) : null
                }
              />
            )}
            {step === 1 && hold && (
              <StepDetails
                hold={hold.record}
                details={details}
                errors={detailErrors}
                onChange={changeDetails}
                onEditDate={() => setStep(0)}
                onAddress={handleAddress}
                onAddressLabel={handleAddressLabel}
                onAddressResolving={handleAddressResolving}
                savedAddresses={savedAddresses}
                showAddressErrors={showAddressErrors}
              />
            )}
            {step === 2 && <StepTyres items={items} vehicle={vehicle} onChange={changeVehicle} wheelsError={wheelsError} savedVehicles={savedVehicles} />}
            {step === 3 && hold && (
              <StepPayment
                items={items}
                hold={hold.record}
                summary={mode2}
                summaryError={summaryError}
                onRetrySummary={() => {
                  setSummary(null);
                  setSummaryRetry((n) => n + 1);
                }}
                order={order}
                submitError={submitError}
                paymentError={paymentError}
                onPaid={paid}
                onPaymentError={setPaymentError}
              />
            )}
            {step > 0 && !hold && (
              <p role="alert" className="msg-error msg-error-box text-sm">
                We lost track of your held time.{" "}
                <button type="button" onClick={pickAnotherTime} className="underline underline-offset-2">
                  Pick a time again
                </button>{" "}
                or call{" "}
                <a href={PHONE_HREF} className="underline underline-offset-2">
                  {PHONE_DISPLAY}
                </a>
                .
              </p>
            )}
          </m.div>
        )}
      </div>
    </Sheet>
  );
}
