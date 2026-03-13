import { CostCalculator } from "@/components/cost-calculator";
import { getCostingPayloadForApp } from "@/server/costing-store";

export default async function CostingPage() {
  const payload = await getCostingPayloadForApp();

  return <CostCalculator {...payload} />;
}
