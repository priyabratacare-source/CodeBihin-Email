# CodeBihin Email backend — shared Hostinger mailbox

The backend connects to one Hostinger mailbox, `admin@codebihin.in`, through the Hostinger Mail REST API. Each official signs in separately with their own Firebase Authentication account. Only accounts carrying the Firebase custom claim `mailAccess: true` (or the super-admin claim) can use the shared mailbox.

## Implemented

- Firebase ID-token verification and revocation checks
- Explicit mailbox-access claim, not just domain matching
- Hostinger Mail API: resolve the permitted mailbox, list folders, list messages, read message text, and send email
- Shared sender identity: `admin@codebihin.in`
- Rate limiting, Helmet, exact-origin CORS and request validation
- Hostinger API token and Firebase service account remain server-side secrets

The first release displays plain-text message bodies. Attachments, rich HTML rendering, delete/archive/move, drafts, threaded replies and realtime notifications are not yet connected to the webmail UI.

## Required environment

Configure these as private backend-host environment variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Admin service-account JSON
- `BOOTSTRAP_ADMIN_UID`: first administrator Firebase UID
- `BOOTSTRAP_SECRET`: one-time random secret for first-admin bootstrap
- `ALLOWED_ORIGINS`: exact frontend origin(s)
- `HOSTINGER_MAILBOX`: `admin@codebihin.in`
- `HOSTINGER_API_TOKEN`: Hostinger Agentic Mail API token

In Hostinger, create the API token with **Selected mailboxes** and select only `admin@codebihin.in`. The token is sent only from this backend to `https://api.mail.hostinger.com` using Bearer authentication. Never put it in GitHub, Firebase client config, Firestore, or browser JavaScript.

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

The command preserves other Firebase custom claims. The official must sign out and sign in again after a claim change. Never give officials the shared Hostinger API token.

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

After deploying this API over HTTPS, set `API_BASE_URL` in `api-config.js` to the deployed API origin. The webmail will show a configuration warning until this is set.

## Important deployment requirement

GitHub Pages cannot run this Node.js API. The backend must be deployed to a Node.js host with outbound HTTPS access. The Hostinger API token and Firebase service account must be stored as server-side secrets, never in GitHub, Firebase client config, or browser code.

The backend has not yet been deployed or tested against the user's live Hostinger mailbox. Do not treat this repository update as a live mailbox connection.
