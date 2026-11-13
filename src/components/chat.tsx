"use client";

import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { importPlanJson, previewPlan, type PreviewTask } from "@/lib/actions";

type Msg = { role: "user" | "assistant"; content: string };
const JSON_BLOCK = /```json\s*([\s\S]*?)```/;

export function Chat({ onPreview, onCommitted }: { onPreview: (t: PreviewTask[]) => void; onCommitted: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<{ raw: string; project: string; count: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setPlan(null);
    setNotice(null);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let full = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        full += value;
        setMessages([...next, { role: "assistant", content: full }]);
        bottom.current?.scrollIntoView({ block: "end" });
      }
      const m = full.match(JSON_BLOCK);
      if (m) {
        const res = await previewPlan(m[1]);
        if (res.tasks) {
          onPreview(res.tasks);
          setPlan({ raw: m[1], project: res.project!, count: res.tasks.length });
        } else setNotice(res.error ?? "Plan illisible");
      }
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Erreur : ${err instanceof Error ? err.message : "IA indisponible"}` }]);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!plan) return;
    setBusy(true);
    const res = await importPlanJson(plan.raw);
    setBusy(false);
    setNotice(res.error ?? `${res.created} tâches ajoutées à « ${res.project} ».`);
    if (!res.error) {
      setPlan(null);
      onCommitted();
    }
  };

  return (
    <section className="flex h-[28rem] min-h-0 flex-col rounded-lg border border-line bg-paper shadow-sm lg:h-auto lg:flex-1">
      <h2 className="border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-ink-mute">Assistant</h2>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages.length === 0 && (
          <p className="text-ink-soft">Décris ton objectif, ton temps disponible et ta date butoir. Les créneaux libres de ton calendrier sont transmis automatiquement.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-canvas px-3 py-2" : "mr-4 whitespace-pre-wrap leading-relaxed"}>
            {m.role === "assistant" ? m.content.replace(JSON_BLOCK, "").trim() || (busy && i === messages.length - 1 ? "…" : "") : m.content}
          </div>
        ))}
        {plan && (
          <div className="rounded-lg border border-line p-3">
            <p className="text-sm">
              {plan.count} tâches proposées pour « {plan.project} », affichées en pointillés sur le calendrier.
            </p>
            <div className="mt-2 flex gap-2">
              <button onClick={commit} disabled={busy} className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50">
                Ajouter au calendrier
              </button>
              <button
                onClick={() => {
                  setPlan(null);
                  onPreview([]);
                }}
                className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
              >
                Ignorer
              </button>
            </div>
          </div>
        )}
        {notice && <p className="text-xs text-ink-soft">{notice}</p>}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Prépare-moi le TOEIC pour le 15 décembre, 1h par soir…"
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button disabled={busy || !input.trim()} className="rounded-md bg-ink p-2 text-white hover:bg-gray-700 disabled:opacity-50" aria-label="Envoyer">
          <SendHorizontal className="size-4" strokeWidth={1.5} />
        </button>
      </form>
    </section>
  );
}
