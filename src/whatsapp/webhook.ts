import { createHmac, timingSafeEqual } from "node:crypto";

export interface IncomingText {
  id: string;
  from: string;
  text: string;
}

/** Vérifie la signature X-Hub-Signature-256 envoyée par Meta. */
export function isValidSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

/** Extrait les messages texte d'une notification webhook WhatsApp. */
export function extractTextMessages(payload: any): IncomingText[] {
  const out: IncomingText[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const msg of change?.value?.messages ?? []) {
        if (msg?.type === "text" && typeof msg.text?.body === "string") {
          out.push({ id: msg.id, from: msg.from, text: msg.text.body });
        }
      }
    }
  }
  return out;
}
