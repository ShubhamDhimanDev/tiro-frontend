import type { ReactNode } from "react";

/**
 * Re-mounts on every navigation, so the new page fades in (CSS, opacity only:
 * no exit animation, no transform, so sticky/fixed children and LCP are
 * unaffected). Server component on purpose.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
