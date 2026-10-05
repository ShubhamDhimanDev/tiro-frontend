"use client";

import { ServiceError } from "@/components/ui/service-error";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { CartExtrasPanel } from "@/components/cart/cart-extras-panel";
import { useLivePricing } from "@/components/cart/use-live-pricing";
import { TyreImage } from "@/components/catalog/tyre-image";
import { Button, buttonClassName } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { CheckIcon, MinusIcon, PinIcon, PlusIcon } from "@/components/ui/icons";
import { INCLUDES_LINE } from "@/components/catalog/pdp-buy-panel";
import { formatMoney } from "@/lib/catalog/format-money";
import { splitTyreLabel } from "@/lib/cart/label";
import { rowPrice } from "@/lib/cart/live-lines";

interface CartDrawerContextValue {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

/** Open/close state for the right-hand cart drawer. Rendered once, near the root. */
export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openDrawer, closeDrawer }), [open, openDrawer, closeDrawer]);
  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer(): CartDrawerContextValue {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer must be used inside <CartDrawerProvider>");
  return ctx;
}

/**
 * "My Cart" drawer. Lines come from the client cart (`CartProvider`,
 * localStorage); prices, promotions, the flexible discount and the total come
 * from `cart/calculate` (`useLivePricing`). The pricing call is only made while
 * the drawer is open, so a closed drawer costs nothing on every page.
 */
function CartDrawer() {
  const { open, closeDrawer } = useCartDrawer();
  // Stay mounted for the exit animation, then unmount so pricing stops.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), 350);
    return () => clearTimeout(t);
  }, [open]);
  if (!mounted) return null;
  return <OpenCartDrawer open={open} onClose={closeDrawer} />;
}

function OpenCartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setQuantity, remove } = useCart();
  const { pricing, zoneId, zoneLoading, openPicker } = useLivePricing();
  const data = pricing.status === "ready" ? pricing.data : null;
  const empty = state.items.length === 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="My Cart"
      side="right"
      dark
      panelTestId="cart-drawer"
      footer={
        empty ? undefined : (
          <div className="flex flex-col gap-3">
            <p data-testid="cart-drawer-includes" className="flex items-start gap-2 text-xs text-muted">
              <CheckIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {INCLUDES_LINE}
            </p>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold text-black">Total Cost (inc. GST)</span>
              <span data-testid="cart-drawer-total" className="type-mono text-xl font-extrabold text-black">
                {data ? formatMoney(data.grand_total, data.currency) : pricing.status === "loading" || zoneLoading ? "Pricing…" : "Set location"}
              </span>
            </div>
            <Link href="/checkout" onClick={onClose} className={buttonClassName({ variant: "green", fullWidth: true })}>
              Checkout
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/cart" onClick={onClose} className={buttonClassName({ variant: "secondary", size: "sm" })}>
                View cart
              </Link>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Keep shopping
              </Button>
            </div>
          </div>
        )
      }
    >
      {empty ? (
        <div className="flex flex-col items-start gap-4 py-6">
          <p className="text-base text-black">Your cart is currently empty.</p>
          <Link href="/tyres" onClick={onClose} className={buttonClassName({ variant: "green" })}>
            Shop tyres now
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col divide-y divide-line">
            {state.items.map((item) => {
              const { name, size } = splitTyreLabel(item.label);
              const key = { tyre_variant_id: item.tyre_variant_id, position: item.position };
              const price = rowPrice(data?.lines, item);
              return (
                <li key={`${item.tyre_variant_id}::${item.position}`} data-testid="cart-drawer-line" className="flex gap-3 py-4 first:pt-0">
                  <TyreImage src={item.image} alt="" sizes="72px" className="h-[72px] w-[72px] shrink-0 rounded-control" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                      <Link href={`/tyres/${item.slug}`} onClick={onClose} className="text-[15px] font-bold leading-tight text-black hover:underline">
                        {name}
                      </Link>
                      {size && <p className="type-mono text-sm text-muted">{size}</p>}
                      {price?.promotion && <p className="text-xs font-semibold text-black">{price.promotion}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div role="group" aria-label={`Quantity for ${name}`} className="inline-flex items-center rounded-control border border-field">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${name}`}
                          disabled={item.quantity <= 1}
                          onClick={() => setQuantity(key, item.quantity - 1)}
                          className="flex h-11 w-11 items-center justify-center text-black disabled:text-muted"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="type-mono w-8 text-center text-[15px] font-bold" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${name}`}
                          disabled={item.quantity >= 20}
                          onClick={() => setQuantity(key, item.quantity + 1)}
                          className="flex h-11 w-11 items-center justify-center text-black disabled:text-muted"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="type-mono text-base font-extrabold text-black">{price ? formatMoney(price.total) : ""}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      className="tap-target -ml-1 self-start px-1 text-sm font-medium text-muted underline underline-offset-2 hover:text-black"
                    >
                      Remove<span className="sr-only"> {name}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {pricing.status === "idle" && !zoneLoading && !zoneId && (
            <div data-testid="cart-location-prompt" className="flex flex-col gap-3 rounded-card bg-band p-4 text-sm">
              <p className="text-black">Enter your suburb or postcode to see prices.</p>
              <Button
                variant="black"
                size="sm"
                onClick={() => {
                  onClose();
                  openPicker();
                }}
                className="w-fit"
              >
                <PinIcon aria-hidden="true" className="h-4 w-4" />
                Set your location
              </Button>
            </div>
          )}
          {pricing.status === "error" && (
            <ServiceError message={pricing.message} onRetry={pricing.retry} />
          )}
          {data && data.discount_lines && data.discount_lines.length > 0 && (
            <ul aria-label="You saved" className="flex flex-col gap-1 rounded-card bg-gold-soft/60 px-3 py-2 text-sm text-black">
              {data.discount_lines.map((line, i) => (
                <li key={`${line.type}-${i}`} className="flex justify-between gap-3">
                  <span>{line.label}</span>
                  <span className="type-mono font-bold">&minus;{formatMoney(line.amount, data.currency)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-card bg-band p-4">
            <CartExtrasPanel pricing={pricing} idPrefix="drawer" />
          </div>
        </div>
      )}
    </Drawer>
  );
}
