// Connexion unique de l'agent à ton agenda Outlook.
// Lance `npm run outlook:login` sur le VPS, ouvre le lien affiché et entre le code.
import { deviceCodeLogin } from "../src/outlook/auth.js";
import { listEvents } from "../src/outlook/calendar.js";

await deviceCodeLogin((msg) => console.log(`\n${msg}\n`));
const now = new Date();
const inAWeek = new Date(now.getTime() + 7 * 86400_000);
const events = await listEvents(now.toISOString().slice(0, 19), inAWeek.toISOString().slice(0, 19));
console.log(`Connecté ✅  ${events.length} événement(s) dans les 7 prochains jours.`);
