import type { StockStatus } from "@/lib/catalog/types";

const STOCK_LABEL: Record<StockStatus, { label: string; className: string }> = {
  in_stock: {
    label: "In stock",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  limited: {
    label: "Limited stock",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  out_of_stock: {
    label: "Out of stock",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  unavailable_in_zone: {
    label: "Not available in your area",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

/** Shared between search/browse cards and the PDP availability section. */
export function StockBadge({ status }: { status: StockStatus }) {
  const { label, className } = STOCK_LABEL[status];
  return <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
