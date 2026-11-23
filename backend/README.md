# CodeBihin Email backend — shared Hostinger mailbox

The backend connects to one Hostinger mailbox, `admin@codebihin.in`, using a server-only app password. Each official signs in separately with their own Firebase Authentication account. Only accounts carrying the Firebase custom claim `mailAccess: true` (or the super-admin claim) can use the shared mailbox.

## Features implemented

- Firebase ID-token verification and revocation checks
- Explicit mailbox-access claim, not just domain matching
- Hostinger IMAP: list folders, list messages, open/read messages
- Hostinger SMTP: send from `admin@codebihin.in`
- Reply action in the webmail UI
- Rate limiting, Helmet, exact-origin CORS and request validation
- Server-side Hostinger credentials only

The current first release supports text-only message display and sending. Attachments, rich HTML rendering, delete/archive/move, drafts and realtime notifications are not implemented yet.

## Required environment

Copy `.env.example` to a private `.env` or configure these as backend-host secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Admin service-account JSON
- `BOOTSTRAP_ADMIN_UID`: first administrator Firebase UID
- `BOOTSTRAP_SECRET`: one-time random secret for first-admin bootstrap
- `ALLOWED_ORIGINS`: exact frontend origin(s)
- `HOSTINGER_MAILBOX`: `admin@codebihin.in`
- `HOSTINGER_APP_PASSWORD`: app password generated for that Hostinger mailbox

Hostinger connection defaults are IMAP `imap.hostinger.com:993` (SSL) and SMTP `smtp.hostinger.com:465` (SSL). Confirm the values in your Hostinger panel before production.

## Install and run

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env
# Fill .env privately
npm start
```

## Grant each official access

First create that official's individual Firebase Authentication account. Then run this command in the backend environment:

```bash
npm run mail-access -- official@codebihin.in grant
```

To revoke access:

```bash
npm run mail-access -- official@codebihin.in revoke
```

The command preserves other Firebase custom claims. The official must sign out and sign in again after a claim change. Never give officials the shared Hostinger app password.

The configured `BOOTSTRAP_ADMIN_UID` receives the `admin`, `role: super_admin`, and `mailAccess` claims after the one-time bootstrap endpoint succeeds. Remove `BOOTSTRAP_SECRET` after bootstrap.

## API endpoints

- `GET /health`
- `GET /api/me`
- `GET /api/mail/identity`
- `GET /api/mail/folders`
- `GET /api/mail/messages?folder=INBOX&page=1`
- `GET /api/mail/messages/:uid?folder=INBOX`
- `POST /api/mail/send` with JSON `{ "to": "person@example.com", "subject": "...", "text": "..." }`
- `POST /api/admin/bootstrap` (one-time)

## Frontend backend URL

After deploying this API over HTTPS, edit `api-config.js` in the repository and set `API_BASE_URL` to the deployed API origin. The webmail will show a configuration warning until this is set.

## Important deployment requirement

GitHub Pages cannot run this Node.js API. The backend must be deployed to a persistent Node.js host with outbound IMAP/SMTP connectivity. The Hostinger app password and Firebase service account must be stored as server-side secrets, never in GitHub, Firebase client config, or browser code.

A backend host is not selected or deployed by this repository update. Do not enter the Hostinger app password into this chat or commit it to GitHub.
