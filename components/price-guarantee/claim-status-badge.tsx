import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { PriceGuaranteeClaimStatus } from "@/lib/price-guarantee/types";

const STATUS_LABEL: Record<PriceGuaranteeClaimStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_TONE: Record<PriceGuaranteeClaimStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function ClaimStatusBadge({ status }: { status: PriceGuaranteeClaimStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
