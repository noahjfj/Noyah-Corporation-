import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { config } from "./config.js";
import { createEvent, deleteEvent, listEvents } from "./outlook/calendar.js";
import { setPending } from "./pending.js";
import { humanLocal, nowLabel } from "./time.js";

const client = new Anthropic();

const SYSTEM = `Tu es l'assistant personnel de noah, au sein de "Noyah Corporation". Tu lui parles sur WhatsApp, en français, de façon brève et chaleureuse (quelques lignes, pas de markdown lourd).

Tu gères son agenda Outlook.
- Les dates et heures sont toujours en heure locale de noah (fuseau ${config.timezone}), au format ISO sans fuseau, ex. 2026-11-20T16:00:00.
- "vendredi" = le prochain vendredi à venir (aujourd'hui inclus seulement si l'heure n'est pas passée).
- Sans durée précisée, compte 1 h.
- Avant de créer un événement, vérifie les conflits avec list_events sur le créneau. S'il y a un conflit, crée quand même si c'est clairement ce que noah veut, et signale-le.
- Pour un événement perso sans invité, agis directement puis confirme en une phrase (jour, date, heures).
- Si l'événement implique d'autres personnes (invités), utilise create_event avec attendees : le système demandera lui-même confirmation à noah. Ne prétends jamais l'avoir envoyé.
- Si une demande est vraiment ambiguë (date impossible à déduire), pose une seule question courte.`;

const isoLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "format AAAA-MM-JJTHH:MM:SS");
const norm = (s: string) => (s.length === 16 ? `${s}:00` : s);

const listEventsTool = betaZodTool({
  name: "list_events",
  description: "Liste les événements de l'agenda Outlook de noah entre deux dates/heures locales.",
  inputSchema: z.object({ start: isoLocal, end: isoLocal }),
  run: async ({ start, end }) => JSON.stringify(await listEvents(norm(start), norm(end))),
});

const createEventTool = betaZodTool({
  name: "create_event",
  description:
    "Crée un événement dans l'agenda Outlook de noah. Avec des invités (attendees), l'événement n'est PAS créé tout de suite : une confirmation est demandée à noah.",
  inputSchema: z.object({
    subject: z.string().describe("Titre court, ex. Pickleball"),
    start: isoLocal,
    end: isoLocal,
    location: z.string().optional(),
    attendees: z.array(z.string().email()).optional().describe("E-mails des invités, seulement si noah en a cités"),
  }),
  run: async (input) => {
    const ev = { ...input, start: norm(input.start), end: norm(input.end) };
    if (ev.attendees?.length) {
      const description = `Créer "${ev.subject}" le ${humanLocal(ev.start)} → ${ev.end.slice(11, 16)} et inviter ${ev.attendees.join(", ")}`;
      setPending({
        description,
        execute: async () => {
          const created = await createEvent(ev);
          return `C'est fait : "${created.subject}" créé, invitation envoyée à ${ev.attendees!.join(", ")}.`;
        },
      });
      return `EN ATTENTE : noah doit répondre "oui" pour confirmer. Résumé à lui présenter : ${description}. Demande-lui de confirmer.`;
    }
    const created = await createEvent(ev);
    return `Créé : ${JSON.stringify(created)}`;
  },
});

const deleteEventTool = betaZodTool({
  name: "delete_event",
  description: "Supprime un événement de l'agenda de noah (id obtenu via list_events). Uniquement sur demande explicite.",
  inputSchema: z.object({ id: z.string() }),
  run: async ({ id }) => {
    await deleteEvent(id);
    return "Supprimé.";
  },
});

// Historique court en mémoire (texte uniquement) pour garder le fil de la conversation.
const history: Anthropic.Beta.BetaMessageParam[] = [];
const MAX_HISTORY = 20;

export async function handleMessage(text: string): Promise<string> {
  const userTurn: Anthropic.Beta.BetaMessageParam = {
    role: "user",
    content: `[Maintenant : ${nowLabel()}]\n${text}`,
  };

  const final = await client.beta.messages.toolRunner({
    model: config.claudeModel,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    tools: [listEventsTool, createEventTool, deleteEventTool],
    messages: [...history, userTurn],
    max_iterations: 8,
  });

  let reply: string;
  if (final.stop_reason === "refusal") {
    reply = "Désolé, je ne peux pas traiter cette demande.";
  } else {
    reply = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim() || "C'est noté.";
  }

  history.push(userTurn, { role: "assistant", content: reply });
  while (history.length > MAX_HISTORY) history.splice(0, 2);
  return reply;
}
