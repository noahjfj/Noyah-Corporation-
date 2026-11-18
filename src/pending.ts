// Actions qui engagent quelqu'un d'autre : l'agent ne les exécute qu'après un "oui" explicite de noah.
// La vérification se fait dans le code, pas dans le modèle.

export interface PendingAction {
  description: string;
  execute: () => Promise<string>;
  createdAt: number;
}

const TTL_MS = 60 * 60 * 1000; // une demande expire après 1 h
let pending: PendingAction | null = null;

export function setPending(action: Omit<PendingAction, "createdAt">) {
  pending = { ...action, createdAt: Date.now() };
}

export function takePending(): PendingAction | null {
  const p = pending;
  pending = null;
  if (p && Date.now() - p.createdAt > TTL_MS) return null;
  return p;
}

export function hasPending(): boolean {
  return pending !== null && Date.now() - pending.createdAt <= TTL_MS;
}

const YES = /^\s*(oui|ouais|yes|ok|okay|go|vas-y|vas y|confirme|je confirme|c'est bon|valide)\b/i;
const NO = /^\s*(non|no|annule|stop|laisse tomber)\b/i;

export function classifyReply(text: string): "yes" | "no" | "other" {
  if (YES.test(text)) return "yes";
  if (NO.test(text)) return "no";
  return "other";
}
