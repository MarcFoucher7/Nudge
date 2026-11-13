import { Planner } from "@/components/planner";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PlannerPage() {
  const userId = await requireUserId();
  const [user, projects] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { icsToken: true } }),
    prisma.project.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);
  return <Planner projects={projects} icsToken={user.icsToken} />;
}
