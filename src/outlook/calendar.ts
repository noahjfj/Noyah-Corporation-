import { config } from "../config.js";
import { getAccessToken } from "./auth.js";

const GRAPH = "https://graph.microsoft.com/v1.0";

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string; // "2026-11-20T16:00:00" en heure locale
  end: string;
  location?: string;
  attendees: string[];
}

export interface NewEvent {
  subject: string;
  start: string; // ISO local sans fuseau, ex. 2026-11-20T16:00:00
  end: string;
  location?: string;
  body?: string;
  attendees?: string[]; // adresses e-mail
}

async function graph(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
      Prefer: `outlook.timezone="${config.timezone}"`,
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`Microsoft Graph ${res.status} : ${data?.error?.message ?? JSON.stringify(data)}`);
  return data;
}

function toEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    subject: e.subject,
    start: e.start?.dateTime?.slice(0, 19),
    end: e.end?.dateTime?.slice(0, 19),
    location: e.location?.displayName || undefined,
    attendees: (e.attendees ?? []).map((a: any) => a.emailAddress?.address).filter(Boolean),
  };
}

/** Événements entre deux dates locales (ISO sans fuseau). */
export async function listEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const q = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    $orderby: "start/dateTime",
    $top: "50",
    $select: "id,subject,start,end,location,attendees",
  });
  const data = await graph(`/me/calendarView?${q}`);
  return (data.value ?? []).map(toEvent);
}

export async function createEvent(ev: NewEvent): Promise<CalendarEvent> {
  const data = await graph("/me/events", {
    method: "POST",
    body: JSON.stringify({
      subject: ev.subject,
      start: { dateTime: ev.start, timeZone: config.timezone },
      end: { dateTime: ev.end, timeZone: config.timezone },
      location: ev.location ? { displayName: ev.location } : undefined,
      body: ev.body ? { contentType: "text", content: ev.body } : undefined,
      attendees: (ev.attendees ?? []).map((address) => ({ emailAddress: { address }, type: "required" })),
    }),
  });
  return toEvent(data);
}

export async function deleteEvent(id: string): Promise<void> {
  await graph(`/me/events/${encodeURIComponent(id)}`, { method: "DELETE" });
}
