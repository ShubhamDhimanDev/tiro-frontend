"use client";

export type NewsletterResult =
  | { kind: "success"; message: string }
  | { kind: "validation_error"; message: string }
  | { kind: "throttled"; message: string }
  | { kind: "error"; message: string };

export type NewsletterSource = "footer" | "home" | "checkout" | "offers" | "blog";

/** Browser helper for this app's own `/api/newsletter` handler. */
export async function subscribeNewsletter(input: {
  email: string;
  first_name?: string;
  source?: NewsletterSource;
  website?: string;
}): Promise<NewsletterResult> {
  let res: Response;
  try {
    res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { kind: "error", message: "We couldn't sign you up. Check your connection and try again." };
  }
  const body = (await res.json().catch(() => ({}))) as { data?: { message?: string }; message?: string; errors?: Record<string, string[]> };
  if (res.status === 201 || res.status === 200) return { kind: "success", message: body.data?.message ?? "Thanks, you're on the list." };
  if (res.status === 429) return { kind: "throttled", message: "Too many attempts, try again in a minute." };
  if (res.status === 422) return { kind: "validation_error", message: body.errors?.email?.[0] ?? body.message ?? "Enter a valid email address." };
  return { kind: "error", message: "Something went wrong on our side. Please try again shortly." };
}
