/**
 * Re-exported from `components/ui/form-field.tsx`, which now owns these
 * (genuinely cross-domain, not auth-specific). Kept here so existing
 * `@/components/auth/form-field` imports in the auth forms don't need to
 * change.
 */
export { FormField, FormError, FormNotice, inputClassName, primaryButtonClassName } from "@/components/ui/form-field";
