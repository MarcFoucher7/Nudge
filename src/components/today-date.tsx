"use client";

import { useSyncExternalStore } from "react";

const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const noop = () => () => {};

// Valeur client-only : vide au prerender (Next 16 / Cache Components), date réelle après hydratation.
export function TodayDate() {
  const label = useSyncExternalStore(noop, () => fmt.format(new Date()), () => "");
  return <p className="min-h-5 text-sm text-ink-mute">{label}</p>;
}
