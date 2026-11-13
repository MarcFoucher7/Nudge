"use client";

import { useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import type { CalendarRef, DateClickInfo, EventClickInfo, EventDropInfo, EventInput, EventSourceFuncInfo } from "@fullcalendar/react";
import classicTheme from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import frLocale from "@fullcalendar/react/locales/fr";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { CalendarArrowDown, Check, Copy, Pencil, Play, Plus, X } from "lucide-react";
import { moveGoogleEvent, moveTask, setTaskDone, type PreviewTask } from "@/lib/actions";
import { Chat } from "./chat";
import { Pomodoro } from "./pomodoro";
import { TaskDialog, type EditableTask, type ProjectOption } from "./task-dialog";

type Selected = Partial<EditableTask> & {
  title: string;
  start: Date;
  end: Date;
  kind: "task" | "google" | "preview";
  googleEventId?: string;
  done?: boolean;
  project?: string | null;
};

const LOAD = {
  HIGH: { label: "Haute", cls: "bg-salmon text-salmon-ink", bg: "#fff1f2", fg: "#be123c" },
  MEDIUM: { label: "Moyenne", cls: "bg-butter text-butter-ink", bg: "#fefce8", fg: "#a16207" },
  LOW: { label: "Basse", cls: "bg-mint text-mint-ink", bg: "#ecfdf5", fg: "#047857" },
};
const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const btn = "inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-soft hover:bg-canvas hover:text-ink";

export function Planner({ projects, icsToken }: { projects: ProjectOption[]; icsToken: string }) {
  const ref = useRef<CalendarRef>(null);
  const [preview, setPreview] = useState<PreviewTask[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [pomodoro, setPomodoro] = useState<Selected | null>(null);
  const [dialog, setDialog] = useState<{ task?: EditableTask | null; start?: Date | null } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();

  const refetch = () => ref.current?.getApi().refetchEvents();

  const previewEvents: EventInput[] = preview.map((t, i) => ({
    id: `preview:${i}`,
    title: t.title,
    start: t.start,
    end: new Date(new Date(t.start).getTime() + t.durationMinutes * 60_000),
    editable: false,
    color: LOAD[t.mentalLoad].bg,
    contrastColor: LOAD[t.mentalLoad].fg,
    classNames: ["nudge-preview"],
    extendedProps: { kind: "preview", description: t.description, mentalLoad: t.mentalLoad },
  }));

  const onDrop = (info: EventDropInfo) => {
    const { event } = info;
    const p = event.extendedProps as Selected;
    if (!event.start || !event.end) return info.revert();
    start(async () => {
      try {
        if (p.kind === "task") await moveTask(p.id!, event.start!.toISOString());
        else if (p.kind === "google") await moveGoogleEvent(p.googleEventId!, event.title, event.start!.toISOString(), event.end!.toISOString());
        else info.revert();
      } catch {
        info.revert();
      }
    });
  };

  const onClick = (info: EventClickInfo) => {
    const { event } = info;
    if (!event.start || !event.end) return;
    const p = event.extendedProps as Record<string, unknown>;
    setSelected({ ...(p as Omit<Selected, "title" | "start" | "end">), id: p.taskId as string | undefined, title: event.title, start: event.start, end: event.end });
  };

  const markDone = (s: Selected) => {
    if (!s.id) return;
    start(async () => {
      await setTaskDone(s.id!, true);
      refetch();
      setSelected(null);
      setPomodoro(null);
    });
  };

  const icsPath = `/api/ics/${icsToken}`;
  const webcal = () => `webcal://${location.host}${icsPath}`;
  const copy = async () => {
    await navigator.clipboard.writeText(webcal());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Planning</h1>
        <div className="relative flex gap-2">
          <button onClick={() => setDialog({})} className={btn}>
            <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
            Tâche
          </button>
          <button onClick={() => setExportOpen((v) => !v)} className={btn} aria-expanded={exportOpen}>
            <CalendarArrowDown className="size-3.5" strokeWidth={1.5} aria-hidden />
            Exporter
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-9 z-10 w-80 rounded-lg border border-line bg-paper p-4 text-sm shadow-sm">
              <p className="font-medium">Abonnement iCalendar</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Apple Calendar, Outlook ou Google : le calendrier se met à jour tout seul. Sur Mac, « Ouvrir dans Calendrier » suffit.
              </p>
              <div className="mt-3 flex gap-2">
                <a href={typeof window === "undefined" ? icsPath : webcal()} className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                  Ouvrir dans Calendrier
                </a>
                <button onClick={copy} className={btn}>
                  {copied ? <Check className="size-3.5" strokeWidth={2} /> : <Copy className="size-3.5" strokeWidth={1.5} />}
                  {copied ? "Copié" : "Copier le lien"}
                </button>
              </div>
              <a href={icsPath} download="nudge.ics" className="mt-3 block text-xs text-ink-mute underline-offset-2 hover:underline">
                Télécharger un fichier .ics (instantané, sans mise à jour)
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="nudge-cal h-[70vh] min-h-0 rounded-lg border border-line bg-paper p-3 shadow-sm lg:h-full">
          <FullCalendar
            ref={ref}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, classicTheme]}
            locale={frLocale}
            initialView="timeGridWeek"
            headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,timeGridDay,dayGridMonth" }}
            firstDay={1}
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            scrollTime="08:00:00"
            nowIndicator
            height="100%"
            editable
            eventDurationEditable={false}
            eventSources={[{ events: (info: EventSourceFuncInfo) => fetch(`/api/events?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`).then((r) => r.json()) }, { events: previewEvents }]}
            eventDrop={onDrop}
            eventClick={onClick}
            dateClick={(info: DateClickInfo) => setDialog({ start: info.date })}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          {selected && (
            <aside className="rounded-lg border border-line bg-paper p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium">{selected.title}</h2>
                <button onClick={() => setSelected(null)} className="text-ink-mute hover:text-ink" aria-label="Fermer">
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              <p className="mt-1 text-xs tabular-nums text-ink-mute">
                {selected.start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {hhmm(selected.start)}–{hhmm(selected.end)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selected.mentalLoad && <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${LOAD[selected.mentalLoad].cls}`}>{LOAD[selected.mentalLoad].label}</span>}
                {selected.project && <span className="text-xs text-ink-mute">{selected.project}</span>}
                {selected.kind === "google" && <span className="text-xs text-ink-mute">Google Calendar</span>}
                {selected.kind === "preview" && <span className="text-xs text-ink-mute">Proposition</span>}
              </div>
              {selected.description && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{selected.description}</p>}
              {selected.kind === "task" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setDialog({ task: selected as EditableTask })} className={btn}>
                    <Pencil className="size-3" strokeWidth={1.5} aria-hidden />
                    Modifier
                  </button>
                  {!selected.done && (
                    <>
                      <button onClick={() => setPomodoro(selected)} className={btn}>
                        <Play className="size-3" strokeWidth={1.5} aria-hidden />
                        Pomodoro
                      </button>
                      <button onClick={() => markDone(selected)} className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
                        <Check className="size-3" strokeWidth={2} aria-hidden />
                        Terminé
                      </button>
                    </>
                  )}
                </div>
              )}
            </aside>
          )}

          <Chat
            onPreview={setPreview}
            onCommitted={() => {
              setPreview([]);
              refetch();
            }}
          />
        </div>
      </div>

      {pomodoro && <Pomodoro title={pomodoro.title} taskId={pomodoro.id} onClose={() => setPomodoro(null)} onDone={() => markDone(pomodoro)} />}

      <TaskDialog
        open={dialog !== null}
        task={dialog?.task ?? null}
        defaultStart={dialog?.start ?? null}
        projects={projects}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          setSelected(null);
          refetch();
        }}
      />
    </div>
  );
}
