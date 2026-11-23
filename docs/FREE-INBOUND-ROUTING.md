# CodeBihin Email — Hostinger-based free-first launch

## Agreed architecture

Keep the domain registration and DNS at Hostinger. Keep Hostinger Email as the active mail provider.

- GitHub Pages: static CodeBihin Email portal.
- Firebase Authentication: employee/admin sign-in to the portal.
- Firestore: employee and role records, protected by the existing restrictive rules.
- Hostinger Email: actual mailboxes, aliases and incoming message handling.
- Hostinger Forwarders: optionally forward selected mailbox messages to verified external destinations such as Gmail.

This setup does not require Cloudflare DNS or a VPS.

## What this release can do

- Receive mail at real Hostinger mailboxes on `@codebihin.in`.
- Use Hostinger aliases for additional addresses delivered into an existing mailbox, subject to the plan's alias limits.
- Forward messages from a Hostinger mailbox to a verified external inbox, subject to plan limits.
- Read and manage the original messages through Hostinger Webmail or a supported mail app.

## What it does not do

- Firebase accounts do not automatically create Hostinger mailboxes.
- The GitHub Pages portal is not an IMAP inbox and does not display messages.
- A forwarder does not send mail as the original CodeBihin address.
- Replies from the destination Gmail normally use the Gmail address, unless the sender separately configures a supported send-as service.
- Forwarding is not guaranteed for every sender. DMARC policies can cause forwarded messages to be rejected.

## Important: preserve current mail DNS

Do not change nameservers or MX records. Do not add Cloudflare Email Routing MX records.

Hostinger's published Hostinger Email MX records are:
- Priority 5: `mx1.hostinger.com`
- Priority 10: `mx2.hostinger.com`

Use the values currently shown in your own Hostinger hPanel as the source of truth. If these are already present and email is working, leave them unchanged.

Hostinger also manages the domain's SPF and DKIM setup. Do not add a second SPF TXT record. If you need to update authentication, use the exact records shown by Hostinger for your account.

## Set up an address using an alias

Use this when a new address should deliver into an existing mailbox:

1. Sign in to Hostinger hPanel.
2. Open **Emails** and select **Manage** beside the `codebihin.in` email plan.
3. Open **Mailboxes** and choose the mailbox that should receive the messages.
4. Find **Aliases** (or the alias management section for that mailbox).
5. Add the required alias, for example `support@codebihin.in`, linked to the intended mailbox.
6. Save and test by sending a message from an unrelated external account.

An alias is an additional address for an existing mailbox; it is not a separate mailbox with its own password or storage.

## Set up a forwarder to Gmail

Use this when a real Hostinger mailbox should also forward incoming messages to a destination inbox:

1. In hPanel, open **Emails → Manage → Forwarders** for `codebihin.in`.
2. Select **Create forwarder**.
3. Choose the existing Hostinger mailbox as the source.
4. Enter the destination Gmail address.
5. Keep **Save copies of forwarded emails** enabled initially, so the original mailbox retains a copy.
6. Create the forwarder.
7. Open the destination inbox and complete Hostinger's verification email.
8. Send a test message and check both the Hostinger mailbox and Gmail Inbox/Spam.

Hostinger's forwarder feature only forwards messages received by the selected source mailbox. It does not forward mail sent out by that mailbox.

## Recommended initial addresses

Start with a small number of functional addresses, each mapped to an existing mailbox or alias:
- `admin@codebihin.in`
- `support@codebihin.in`
- `careers@codebihin.in`

Confirm which mailbox receives each alias before publishing the address. The number of mailboxes, aliases, filters and forwarders depends on the active Hostinger plan.

## Delivery caveats

Forwarding may fail for some senders because strict DMARC policies can reject forwarded messages. If an important sender's mail is missing, check the original Hostinger mailbox first, then Hostinger's forwarding status and destination Spam folder. For reliability, use the original Hostinger mailbox via Webmail or IMAP as the primary inbox.

## Official Hostinger documentation

- [Set up a Hostinger Email forwarder](https://www.hostinger.com/support/1583221-how-to-set-up-a-forwarder-for-hostinger-email/)
- [Email forwarding limitations and alternatives](https://www.hostinger.com/support/email-forwarding-known-limitations-and-alternatives/)
- [Catch-all, forwarder and alias differences](https://www.hostinger.com/support/4469114-differences-and-applications-of-catch-all-forwarder-and-email-alias-at-hostinger/)
- [Hostinger Email MX records](https://www.hostinger.com/support/4407237-hostinger-email-mx-records/)

## Current application status

The portal login authenticates provisioned CodeBihin identities with Firebase. It does not provision a Hostinger mailbox or expose mail contents. Mailbox/alias/forwarder administration is performed in Hostinger hPanel for this first release.