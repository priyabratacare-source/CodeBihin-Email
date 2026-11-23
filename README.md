# CodeBihin Email

CodeBihin Email is being developed in stages.

## Current free launch

The first release uses:
- GitHub Pages for the web portal
- Firebase Authentication for CodeBihin account sign-in
- Firestore for employee and role data
- Cloudflare Email Routing for incoming email forwarding to verified existing inboxes

**This is forwarding, not a hosted mailbox.** The first release does not provide IMAP/POP, mailbox storage, or the ability to send/reply from a `@codebihin.in` address. Replies from a forwarded Gmail message use the Gmail sender address.

## Setup guide

Read [docs/FREE-INBOUND-ROUTING.md](docs/FREE-INBOUND-ROUTING.md) before changing DNS. Cloudflare Email Routing requires Cloudflare DNS. Copy and verify the existing Hostinger DNS zone before changing nameservers; an incorrect migration can interrupt websites or existing email.

## Existing backend

The `backend/` folder contains an API foundation for a future hosted service. It is not required for Cloudflare's basic forwarding and is not currently deployed. Never commit service-account credentials or secrets.

## Website

GitHub Pages: https://priyabratacare-source.github.io/CodeBihin-Email/
