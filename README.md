# CodeBihin Email

CodeBihin Email is an official webmail portal for a shared Hostinger mailbox.

## Agreed first-release model

- Each official signs in using their own Firebase Authentication account.
- The authorised officials access the same Hostinger mailbox: `admin@codebihin.in`.
- The backend connects to Hostinger using a server-side app password.
- Officials can list folders, read messages, reply and send from the shared official address.
- Mailbox access is granted individually through the Firebase custom claim `mailAccess: true`.
- Hostinger DNS and the existing Hostinger Email MX records remain unchanged.

## Important security

Never put the Hostinger app password or Firebase service-account JSON in GitHub frontend files. They belong only in the private backend host's environment secrets. Officials must never receive the shared mailbox app password.

## Repository structure

- `index.html`, `app.js`, `style.css`: official sign-in page
- `webmail.html`, `webmail.js`, `webmail.css`: shared mailbox interface
- `api-config.js`: HTTPS backend URL, set after deployment
- `backend/`: Node.js API using Firebase Admin, IMAP and SMTP

## Setup guide

See [backend/README.md](backend/README.md) for deployment requirements and how to grant or revoke each official's mailbox access.

## Hosting status

GitHub Pages hosts only the frontend. The Node.js backend must be deployed separately to a persistent host that permits outbound IMAP and SMTP connections. It has not yet been deployed.