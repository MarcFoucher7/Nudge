"use client";

import { useActionState } from "react";
import { importPlan, type ImportState } from "@/lib/actions";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importPlan, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="json"
        required
        rows={12}
        placeholder='{ "project": "TOEIC", "tasks": [ ... ] }'
        className="w-full rounded-lg border border-line bg-paper p-3 font-mono text-xs leading-relaxed outline-none focus:border-ink"
      />
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Planification…" : "Importer"}
        </button>
        {state.error && <p className="text-sm text-salmon-ink">{state.error}</p>}
        {state.created !== undefined && (
          <p className="text-sm text-mint-ink">
            {state.created} tâches ajoutées à « {state.project} ».
          </p>
        )}
      </div>
    </form>
  );
}
