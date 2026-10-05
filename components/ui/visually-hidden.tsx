import type { ElementType, ReactNode } from "react";

/** Content available to screen readers only (Tailwind's `sr-only`). */
export function VisuallyHidden({
  as: Tag = "span",
  children,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Tag className="sr-only" {...rest}>
      {children}
    </Tag>
  );
}
