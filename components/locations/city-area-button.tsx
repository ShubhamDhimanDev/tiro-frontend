"use client";

import { useState } from "react";
import { useLocation } from "@/components/location/location-provider";
import { Button } from "@/components/ui/button";
import { PinIcon } from "@/components/ui/icons";
import { locationApi } from "@/lib/location/client-api";

/**
 * "Use {city} for prices and times": sets the visitor's area to the city (via
 * the city's own postcode, through the normal serviceability check), so the
 * finder above shows prices for it. Renders a plain confirmation once set.
 */
export function CityAreaButton({ cityName, postcode }: { cityName: string; postcode: string | null }) {
  const { setZone } = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  if (!postcode) return null;

  async function apply() {
    setBusy(true);
    setMessage(null);
    const res = await locationApi.check({ postcode: postcode as string });
    setBusy(false);
    if (res.kind === "success" && res.data.serviceable && res.data.service_zone_id !== null && res.data.label) {
      setZone({ zoneId: String(res.data.service_zone_id), label: res.data.label });
      setMessage({ tone: "ok", text: `Done. Prices and times now match ${res.data.label}.` });
      return;
    }
    setMessage({ tone: "bad", text: "We couldn't set that area just now. Try a suburb from the list below." });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" size="sm" loading={busy} onClick={() => void apply()}>
        <PinIcon aria-hidden="true" className="h-4 w-4" />
        Use {cityName} for prices and times
      </Button>
      <p role="status" aria-live="polite" className={message?.tone === "bad" ? "text-sm msg-error" : "text-sm font-medium text-success"}>
        {message?.text}
      </p>
    </div>
  );
}
