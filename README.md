# Noyah Corporation

Agent IA personnel de noah. Étape 1 : on lui parle sur **WhatsApp** et il gère l'**agenda Outlook**.

> Exemple : « ajoute vendredi pickleball à 16h pendant 1h30 » → l'événement apparaît dans Outlook et l'agent confirme sur WhatsApp.

## Règle d'autonomie

- Agenda perso (sans invité) : l'agent agit seul et confirme.
- Dès qu'une autre personne est impliquée (invités) : l'agent demande « oui / non » sur WhatsApp avant d'agir. Ce contrôle est fait dans le code (`src/pending.ts`), pas laissé au modèle.
- Seuls les messages du numéro `OWNER_WHATSAPP_NUMBER` sont traités.

## Architecture

```
WhatsApp ──► Meta Cloud API ──► https://<domaine>/webhook (Caddy, HTTPS)
                                        │
                                        ▼
                          src/server.ts (Express, port 3000 local)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
            src/agent.ts (Claude + outils)        src/pending.ts (confirmations)
                     │
                     ▼
            src/outlook/* (Microsoft Graph, agenda)
```

## Mise en route

1. Remplir `.env` à partir de `.env.example` (jamais dans Git).
2. Sur le VPS : `bash deploy/setup.sh <domaine>` (sans domaine : `<ip-avec-tirets>.sslip.io`).
3. Connecter Outlook une fois : `sudo -u noyah npm run outlook:login` dans `/opt/noyah-corporation`.
4. Chez Meta, configurer le webhook : URL `https://<domaine>/webhook`, jeton = `WHATSAPP_VERIFY_TOKEN`, s'abonner au champ `messages`.

## Développement

```
npm install
npm test         # tests unitaires
npm run typecheck
```
