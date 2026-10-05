"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipButton } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Input, Select } from "@/components/ui/field";
import { TyreIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { TyreLoader } from "@/components/ui/tyre-loader";
import { Tabs } from "@/components/ui/tabs";

const SWATCHES = [
  ["gold", "bg-gold text-black", "#FFCE00"],
  ["green", "bg-green text-white", "#3C8425"],
  ["gold-soft (warning wash)", "bg-gold-soft text-black", "#FFF4BF"],
  ["ink", "bg-black text-white", "#000000"],
  ["footer", "bg-footer text-white", "#242424"],
  ["band", "bg-band text-black border border-line", "#F8F8F8"],
  ["chip", "bg-chip text-black", "#F4F4F4"],
  ["muted", "bg-muted text-white", "#5A5F66"],
] as const;

/** Dev-only primitives kit (`/dev/ui`). Not linked from the site. */
export function KitDemo() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [chip, setChip] = useState(true);

  return (
    <div className="container-page flex flex-col gap-10 py-10">
      <header>
        <h1 className="type-display">UI kit</h1>
        <p className="mt-2 text-muted">Design v2 tokens and primitives. Dev only.</p>
      </header>

      <section aria-labelledby="k-colour" className="flex flex-col gap-3">
        <h2 id="k-colour" className="type-h2">Colour</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SWATCHES.map(([name, cls, hex]) => (
            <li key={name} className={`${cls} rounded-card p-4`}>
              <span className="block font-bold">{name}</span>
              <span className="type-mono text-sm">{hex}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="k-type" className="flex flex-col gap-2">
        <h2 id="k-type" className="type-h2">Type (Montserrat)</h2>
        <p className="type-display">Display 800</p>
        <p className="type-h2">Heading two 700</p>
        <p className="type-h3">Heading three 700</p>
        <p>Body 16px / 400 with zero tracking. The quick brown fox jumps over the lazy dog.</p>
        <p className="type-small text-muted">Small 14px muted.</p>
      </section>

      <section aria-labelledby="k-btn" className="flex flex-col gap-3">
        <h2 id="k-btn" className="type-h2">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="green">Find tyres</Button>
          <Button variant="yellow">Search tyres</Button>
          <Button variant="black">Checkout</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button size="lg">Large 62px</Button>
        </div>
      </section>

      <section aria-labelledby="k-form" className="flex flex-col gap-3">
        <h2 id="k-form" className="type-h2">Inputs</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Vehicle registration" placeholder="E.g. AAA 345" />
          <Select label="State" defaultValue="">
            <option value="">Select</option>
            <option>NSW</option>
            <option>VIC</option>
          </Select>
          <Input label="With error" error="Enter a valid email address." defaultValue="nope" />
        </div>
      </section>

      <section aria-labelledby="k-tabs" className="flex flex-col gap-3">
        <h2 id="k-tabs" className="type-h2">Tabs and accordion</h2>
        <Tabs
          label="Demo tabs"
          tabs={[
            { key: "a", label: "Search by size", panel: <p className="py-4">Size panel</p> },
            { key: "b", label: "Search by vehicle", panel: <p className="py-4">Vehicle panel</p> },
          ]}
        />
        <Accordion
          variant="icons"
          defaultOpenId="a"
          items={[
            { id: "a", title: "Tyre sales", icon: <TyreIcon className="h-6 w-6" />, content: "Panel content." },
            { id: "b", title: "Onsite fitting", icon: <TyreIcon className="h-6 w-6" />, content: "More content." },
          ]}
        />
      </section>

      <section aria-labelledby="k-misc" className="flex flex-col gap-3">
        <h2 id="k-misc" className="type-h2">Badge, chip, card, skeleton</h2>
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier="premium" />
          <TierBadge tier="mid" />
          <TierBadge tier="budget" />
          <Badge tone="green">4 for 3</Badge>
          <Badge tone="gold">Ends soon</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Payment failed</Badge>
          <Chip>Low noise</Chip>
          <ChipButton selected={chip} onClick={() => setChip(!chip)}>Toggle chip</ChipButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="font-bold">Card</p>
            <p className="text-muted">10px radius, hairline border, 2px/4px shadow.</p>
          </Card>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24" />
            <div className="flex items-end gap-6">
              <TyreLoader size="sm" label="Loading small" />
              <TyreLoader size="md" label="Loading medium" />
              <TyreLoader size="lg" label="Loading large" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
        </div>
      </section>

      <Modal open={modal} onClose={() => setModal(false)} title="Modal">
        <p>Centred on tablet and up, bottom sheet on phones.</p>
      </Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Drawer" dark>
        <p>Right-hand panel (bottom sheet on phones).</p>
      </Drawer>
    </div>
  );
}
