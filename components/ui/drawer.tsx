"use client";

import type { ReactNode } from "react";
import { Sheet } from "./sheet";

/**
 * Side panel. `side="right"` (cart): right-hand panel on tablet+, bottom sheet
 * on phones. `side="left"` (site menu): left drawer at every width. `dark`
 * gives the black header with white title.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  dark = false,
  panelTestId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  dark?: boolean;
  panelTestId?: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      presentation={side === "left" ? "drawer" : "drawer-right"}
      headerTone={dark ? "dark" : "light"}
      panelTestId={panelTestId}
    >
      {children}
    </Sheet>
  );
}
