import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitDemo } from "@/components/ui/kit-demo";

export const metadata: Metadata = { title: "UI kit (dev)", robots: { index: false, follow: false } };

/** Primitives showcase for design review. 404s in production builds. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitDemo />;
}
