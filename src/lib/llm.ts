// Client OpenAI-compatible (Ollama, LM Studio, vLLM, llama.cpp…) : LLM_BASE_URL, LLM_MODEL, LLM_API_KEY.
// Sans LLM_BASE_URL, un stub renvoie un plan d'exemple pour développer l'interface.

export type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function chatStream(messages: Msg[]): Promise<ReadableStream<Uint8Array>> {
  const base = process.env.LLM_BASE_URL;
  if (!base) return stub();

  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.LLM_API_KEY ? { authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: process.env.LLM_MODEL ?? "llama3.1", messages, stream: true, temperature: 0.3 }),
  });
  if (!res.ok || !res.body) throw new Error(`LLM ${res.status} ${await res.text().catch(() => "")}`);

  // SSE "data: {...}" → texte brut
  const enc = new TextEncoder();
  let buf = "";
  return res.body.pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(chunk, ctrl) {
        buf += chunk;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") return;
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) ctrl.enqueue(enc.encode(delta));
        }
      },
    }),
  );
}

function stub(): ReadableStream<Uint8Array> {
  const text = `Mode démonstration : aucune IA n'est configurée (LLM_BASE_URL). Voici un exemple de plan.

\`\`\`json
{
  "project": "Exemple",
  "tasks": [
    { "title": "Lire le chapitre 1", "description": "Qu'est-ce qu'un nudge ? Cite deux exemples.", "duration_minutes": 25, "mental_load": "high", "method_used": "pomodoro", "schedule_offset_days": 0 },
    { "title": "Revoir le chapitre 1 (J+1)", "duration_minutes": 15, "mental_load": "low", "method_used": "spaced_repetition", "schedule_offset_days": 1 },
    { "title": "Revoir le chapitre 1 (J+3)", "duration_minutes": 15, "mental_load": "low", "method_used": "spaced_repetition", "schedule_offset_days": 3 }
  ]
}
\`\`\``;
  const enc = new TextEncoder();
  const words = text.split(/(?<= )/);
  return new ReadableStream({
    async start(ctrl) {
      for (const w of words) {
        ctrl.enqueue(enc.encode(w));
        await new Promise((r) => setTimeout(r, 15));
      }
      ctrl.close();
    },
  });
}
