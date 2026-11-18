import express from "express";
import { config } from "./config.js";
import { handleMessage } from "./agent.js";
import { classifyReply, hasPending, takePending } from "./pending.js";
import { markAsRead, sendWhatsAppText } from "./whatsapp/client.js";
import { extractTextMessages, isValidSignature } from "./whatsapp/webhook.js";

const app = express();
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

app.get("/health", (_req, res) => { res.json({ ok: true }); });

// Vérification du webhook par Meta (une seule fois, à la configuration)
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === config.whatsapp.verifyToken()) {
    res.status(200).send(String(req.query["hub.challenge"]));
  } else {
    res.sendStatus(403);
  }
});

const seen = new Set<string>();

app.post("/webhook", (req: any, res) => {
  if (!isValidSignature(req.rawBody, req.get("x-hub-signature-256"), config.whatsapp.appSecret())) {
    res.sendStatus(401);
    return;
  }
  res.sendStatus(200); // Meta attend une réponse rapide ; le traitement continue ensuite.

  for (const msg of extractTextMessages(req.body)) {
    if (seen.has(msg.id)) continue; // Meta peut renvoyer le même message
    seen.add(msg.id);
    if (seen.size > 1000) seen.clear();
    if (msg.from !== config.whatsapp.ownerNumber()) {
      console.warn(`Message ignoré d'un numéro inconnu (${msg.from.slice(0, 4)}…)`);
      continue;
    }
    void process(msg.id, msg.text);
  }
});

let queue = Promise.resolve();

function process(id: string, text: string) {
  // Un message à la fois, dans l'ordre d'arrivée
  queue = queue.then(async () => {
    const owner = config.whatsapp.ownerNumber();
    await markAsRead(id);
    try {
      if (hasPending()) {
        const answer = classifyReply(text);
        if (answer === "yes") {
          await sendWhatsAppText(owner, await takePending()!.execute());
          return;
        }
        if (answer === "no") {
          takePending();
          await sendWhatsAppText(owner, "OK, j'annule.");
          return;
        }
        takePending(); // autre sujet : la demande en attente est abandonnée
      }
      await sendWhatsAppText(owner, await handleMessage(text));
    } catch (err) {
      console.error(err);
      await sendWhatsAppText(owner, `Oups, un souci : ${(err as Error).message}`).catch(() => undefined);
    }
  });
  return queue;
}

app.listen(config.port, "127.0.0.1", () => {
  console.log(`Noyah Corporation à l'écoute sur http://127.0.0.1:${config.port}`);
});
