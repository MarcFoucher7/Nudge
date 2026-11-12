import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-paper p-8 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Nudge</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Connexion avec Google. L&apos;accès au calendrier sert à lire ton emploi du temps et à y placer tes tâches.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700">
            Continuer avec Google
          </button>
        </form>
      </div>
    </main>
  );
}
