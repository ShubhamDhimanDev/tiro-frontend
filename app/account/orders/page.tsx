import type { Metadata } from "next";
import { OrderHistoryList } from "@/components/account/order-history-list";

export default function AccountOrdersPage() {
  return <OrderHistoryList />;
}

export const metadata: Metadata = { title: "Order history | Tiro Mobile Tyres" };
