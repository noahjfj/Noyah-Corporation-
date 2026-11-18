import { readFile, writeFile, mkdir } from "node:fs/promises";
import { config } from "../config.js";

export const SCOPES = "offline_access User.Read Calendars.ReadWrite";

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

const authority = () => `https://login.microsoftonline.com/${config.microsoft.tenant}/oauth2/v2.0`;

async function saveToken(t: { access_token: string; refresh_token: string; expires_in: number }) {
  const stored: StoredToken = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + (t.expires_in - 60) * 1000,
  };
  await mkdir(new URL(".", config.microsoft.tokenFile), { recursive: true });
  await writeFile(config.microsoft.tokenFile, JSON.stringify(stored), { mode: 0o600 });
  return stored;
}

/** Connexion initiale (une seule fois) : flux "device code", on valide sur microsoft.com/devicelogin. */
export async function deviceCodeLogin(log: (msg: string) => void): Promise<void> {
  const body = new URLSearchParams({ client_id: config.microsoft.clientId(), scope: SCOPES });
  const res = await fetch(`${authority()}/devicecode`, { method: "POST", body });
  const dc: any = await res.json();
  if (!res.ok) throw new Error(`Device code refusé : ${JSON.stringify(dc)}`);
  log(dc.message);

  let interval = (dc.interval ?? 5) * 1000;
  const deadline = Date.now() + dc.expires_in * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));
    const tokenRes = await fetch(`${authority()}/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.microsoft.clientId(),
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: dc.device_code,
      }),
    });
    const data: any = await tokenRes.json();
    if (tokenRes.ok) {
      await saveToken(data);
      return;
    }
    if (data.error === "slow_down") interval += 5000;
    else if (data.error !== "authorization_pending") throw new Error(`Connexion échouée : ${data.error_description ?? data.error}`);
  }
  throw new Error("Délai de connexion dépassé, relance la commande.");
}

/** Renvoie un jeton d'accès valide, rafraîchi automatiquement. */
export async function getAccessToken(): Promise<string> {
  let stored: StoredToken;
  try {
    stored = JSON.parse(await readFile(config.microsoft.tokenFile, "utf8"));
  } catch {
    throw new Error("Outlook n'est pas encore connecté : lance `npm run outlook:login` sur le VPS.");
  }
  if (Date.now() < stored.expires_at) return stored.access_token;

  const res = await fetch(`${authority()}/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: config.microsoft.clientId(),
      grant_type: "refresh_token",
      refresh_token: stored.refresh_token,
      scope: SCOPES,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`Rafraîchissement Outlook échoué : ${data.error_description ?? data.error}`);
  return (await saveToken(data)).access_token;
}
