# CodeBihin Email API

This is the Node.js API foundation. It is intended to run on your own VPS, not GitHub Pages.

## Included
- Firebase Admin SDK initialization using a VPS-only environment variable
- Firebase ID-token verification
- Server-side CodeBihin root/subdomain email validation
- Admin custom-claim authorization
- One-time first-admin bootstrap restricted to the configured UID
- Health endpoint and basic security middleware

## Local preparation
1. Install Node.js 20 or later.
2. In this directory run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in the environment values on your private machine/VPS only.
5. Run `npm start`.

## Required VPS environment values
- `FIREBASE_SERVICE_ACCOUNT_JSON`: complete Firebase service-account JSON, stored as a secret environment variable. Never commit it.
- `BOOTSTRAP_ADMIN_UID`: the Firebase Auth UID of the intended first administrator.
- `BOOTSTRAP_SECRET`: a long, random, one-time setup secret.
- `ALLOWED_ORIGINS`: comma-separated exact frontend origins.

## Endpoints
- `GET /health`: service health
- `GET /api/me`: authenticated CodeBihin account and claims
- `GET /api/admin/status`: administrator-only test
- `POST /api/admin/bootstrap`: one-time first-admin claim assignment

For bootstrap, send the `X-Bootstrap-Secret` header. The endpoint does not accept a UID from the request body; it can only grant access to `BOOTSTRAP_ADMIN_UID`.

After successful bootstrap, remove `BOOTSTRAP_SECRET` from the VPS environment and restart the service. The service account credential must remain private. Never place it in frontend JavaScript, GitHub Pages, or a public repository.

This API does not yet create mailboxes or send/receive email. Those require the separately deployed SMTP/IMAP mail server and persistent storage.
