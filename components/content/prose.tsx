import { cx } from "@/components/ui/cx";
import { warnUnresolvedTokens } from "@/lib/content/guards";

/**
 * Renders admin-authored article HTML with the `.prose-tiro` styles.
 * `html` is trusted (RBAC-gated rich-text editor; see content-page-body.tsx),
 * the same assumption the old `.cms-body` renderer made.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  warnUnresolvedTokens("Prose body", html);
  return <div className={cx("prose-tiro", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
