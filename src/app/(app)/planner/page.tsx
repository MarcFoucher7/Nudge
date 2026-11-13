import { Planner } from "@/components/planner";
import { requireUserId } from "@/lib/auth";

export default async function PlannerPage() {
  await requireUserId();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Planning</h1>
      <Planner />
    </div>
  );
}
