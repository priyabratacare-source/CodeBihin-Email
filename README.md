# CodeBihin Email

CodeBihin Email is being developed in stages, using Hostinger Email for the initial mail service.

## Current free-first setup

- GitHub Pages: web portal
- Firebase Authentication: CodeBihin employee/admin portal sign-in
- Firestore: employee and role records
- Hostinger Email: actual mailboxes and incoming email
- Hostinger aliases and forwarders: additional addresses and optional Gmail forwarding

**DNS stays at Hostinger.** Do not switch nameservers or MX records to Cloudflare. Do not add Cloudflare Email Routing records while Hostinger Email is receiving mail.

This is not a standalone mailbox platform yet. The portal login does not create a Hostinger mailbox or display messages. Use Hostinger Webmail or a supported mail app to read the actual mailbox.

## Setup guide

Read [docs/FREE-INBOUND-ROUTING.md](docs/FREE-INBOUND-ROUTING.md) for safe alias and forwarder setup without changing DNS.

## Backend

The `backend/` folder is a foundation for a future API. It is not deployed and is not required for Hostinger's built-in mail forwarding. Never commit service-account credentials or secrets.

## Website

https://priyabratacare-source.github.io/CodeBihin-Email/