import { config } from "../config.js";

const GRAPH = "https://graph.facebook.com/v23.0";

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${config.whatsapp.phoneNumberId()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: body.slice(0, 4096) },
    }),
  });
  if (!res.ok) {
    throw new Error(`Envoi WhatsApp échoué (${res.status}) : ${await res.text()}`);
  }
}

/** Marque le message comme lu (double coche bleue). Erreurs ignorées. */
export async function markAsRead(messageId: string): Promise<void> {
  await fetch(`${GRAPH}/${config.whatsapp.phoneNumberId()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
  }).catch(() => undefined);
}
