import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { extractTextMessages, isValidSignature } from "../src/whatsapp/webhook.js";
import { classifyReply, hasPending, setPending, takePending } from "../src/pending.js";
import { humanLocal } from "../src/time.js";

test("signature Meta valide / invalide", () => {
  const body = Buffer.from('{"a":1}');
  const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(isValidSignature(body, sig, "secret"), true);
  assert.equal(isValidSignature(body, sig, "autre"), false);
  assert.equal(isValidSignature(body, undefined, "secret"), false);
});

test("extraction des messages texte WhatsApp", () => {
  const payload = {
    entry: [{ changes: [{ value: { messages: [
      { id: "m1", from: "32470000000", type: "text", text: { body: "ajoute vendredi pickleball à 16h pendant 1h30" } },
      { id: "m2", from: "32470000000", type: "image", image: {} },
    ] } }] }],
  };
  assert.deepEqual(extractTextMessages(payload), [
    { id: "m1", from: "32470000000", text: "ajoute vendredi pickleball à 16h pendant 1h30" },
  ]);
  assert.deepEqual(extractTextMessages({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] }), []);
});

test("réponses de confirmation", () => {
  assert.equal(classifyReply("Oui vas-y"), "yes");
  assert.equal(classifyReply("ok"), "yes");
  assert.equal(classifyReply("non merci"), "no");
  assert.equal(classifyReply("ajoute aussi samedi"), "other");
  assert.equal(classifyReply("nouvelle idée"), "other");
});

test("action en attente consommée une seule fois", async () => {
  setPending({ description: "x", execute: async () => "fait" });
  assert.equal(hasPending(), true);
  assert.equal(await takePending()!.execute(), "fait");
  assert.equal(takePending(), null);
});

test("affichage d'une date locale", () => {
  assert.equal(humanLocal("2026-11-20T16:00:00"), "vendredi 20 novembre, 16:00");
});
