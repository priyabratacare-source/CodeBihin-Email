# CodeBihin Email — shared Hostinger mailbox

## Agreed model

CodeBihin Email is an official webmail portal. It is not an employee mailbox provisioning system.

- Each official signs in with their own Firebase Authentication account.
- Officials who have the `mailAccess: true` custom claim can access one shared Hostinger mailbox: `admin@codebihin.in`.
- The backend connects to Hostinger IMAP and SMTP using one app password stored only in backend secrets.
- The webmail frontend is hosted on GitHub Pages.
- The Node.js backend must be deployed separately.
- Hostinger remains the DNS provider and Hostinger Email remains the receiving service.

## Hostinger connection settings

Confirm these in the Hostinger panel for your own email plan before production:

- IMAP: `imap.hostinger.com`, port `993`, SSL/TLS
- SMTP: `smtp.hostinger.com`, port `465`, SSL/TLS
- Mailbox username: `admin@codebihin.in`
- Password: an app password generated for this mailbox, stored as `HOSTINGER_APP_PASSWORD` on the backend host only

Official Hostinger documentation:
- [Create an app password](https://www.hostinger.com/support/how-to-create-an-app-password-for-hostinger-email/)
- [Hostinger mailbox management](https://www.hostinger.com/support/1583217-how-to-create-and-manage-mailboxes-for-hostinger-email/)

## Granting an official access

Create an individual Firebase Authentication account for the official. In the backend environment, use:

```bash
npm run mail-access -- official@codebihin.in grant
```

To revoke access:

```bash
npm run mail-access -- official@codebihin.in revoke
```

The official must sign out and sign in again after a claim change. A valid CodeBihin email domain alone does not grant access.

## Security

- Never place the Hostinger app password in browser JavaScript, GitHub, or Firebase client configuration.
- Never give the shared mailbox app password to individual officials.
- Each official gets their own Firebase login; backend checks the verified Firebase token and mailbox-access claim.
- The backend must run over HTTPS and store secrets as private environment variables.
- The shared mailbox grants full read/send access to every official who has been authorised. This first version does not provide per-folder or per-message permissions.

## Current feature scope

Implemented in the repository:
- Official login page
- Shared webmail layout
- Folder and message listing
- Read message text
- Compose and send from the shared address
- Reply action
- Per-official mailbox access claim

Not yet implemented:
- Attachments
- Rich HTML message rendering
- Delete, archive, move, spam controls
- Draft synchronisation
- Realtime push notifications
- Persistent audit dashboard

## Deployment status

GitHub Pages hosts only the frontend. The Node.js backend is not yet deployed. Set `API_BASE_URL` in `api-config.js` only after the backend has an HTTPS URL. Keep Hostinger DNS and MX records unchanged; no Cloudflare nameserver migration is required for this design.
