import { config } from "./config.js";

/** Ex. "mercredi 18 novembre 2026, 15:02 (Europe/Brussels)" */
export function nowLabel(date = new Date(), tz = config.timezone): string {
  const s = new Intl.DateTimeFormat("fr-BE", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${s} (${tz})`;
}

/** "2026-11-20T16:00:00" -> "vendredi 20 novembre, 16:00" (la valeur est déjà en heure locale). */
export function humanLocal(isoLocal: string): string {
  const [d, t] = isoLocal.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-BE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
    .format(new Date(Date.UTC(y, m - 1, day)));
  return `${label}, ${t.slice(0, 5)}`;
}
