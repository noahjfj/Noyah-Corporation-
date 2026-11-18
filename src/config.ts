import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  timezone: process.env.TIMEZONE ?? "Europe/Brussels",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
  whatsapp: {
    phoneNumberId: () => required("WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: () => required("WHATSAPP_ACCESS_TOKEN"),
    appSecret: () => required("WHATSAPP_APP_SECRET"),
    verifyToken: () => required("WHATSAPP_VERIFY_TOKEN"),
    ownerNumber: () => required("OWNER_WHATSAPP_NUMBER"),
  },
  microsoft: {
    clientId: () => required("MS_CLIENT_ID"),
    tenant: process.env.MS_TENANT ?? "consumers",
    tokenFile: new URL("../data/ms-token.json", import.meta.url),
  },
};
