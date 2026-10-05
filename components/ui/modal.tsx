"use client";

import type { ReactNode } from "react";
import { Sheet } from "./sheet";

/**
 * Centred dialog on tablet+, bottom sheet on phones. A named wrapper over
 * `Sheet` (focus trap, Escape, scroll lock, focus return) so feature code
 * reads `<Modal>` for dialogs and `<Drawer>` for side panels.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={footer} desktop="dialog" className={className}>
      {children}
    </Sheet>
  );
}
