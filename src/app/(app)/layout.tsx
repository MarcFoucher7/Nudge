import Link from "next/link";
import { BookOpen, CalendarDays, CalendarRange, FileJson, Flame, Folder, LogOut } from "lucide-react";
import { requireUserId, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const nav = [
  { href: "/dashboard", label: "Aujourd'hui", Icon: CalendarDays },
  { href: "/planner", label: "Planning", Icon: CalendarRange },
  { href: "/projects", label: "Projets", Icon: Folder },
  { href: "/import", label: "Importer", Icon: FileJson },
  { href: "/academy", label: "Méthodes", Icon: BookOpen },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentStreak: true } });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-paper px-3 py-5 md:flex">
        <Link href="/dashboard" className="px-2 text-sm font-semibold tracking-tight">
          Nudge
        </Link>
        <nav className="mt-6 flex flex-col gap-0.5">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-ink-soft transition hover:bg-canvas hover:text-ink"
            >
              <Icon className="size-4" strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 px-2 text-sm text-ink-soft">
          <span className="flex items-center gap-2">
            <Flame className="size-4" strokeWidth={1.5} aria-hidden />
            Série : <span className="font-medium text-ink">{user.currentStreak} j</span>
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
