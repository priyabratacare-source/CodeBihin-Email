# CodeBihin Email — Free inbound forwarding launch

## What this first release does

This release uses Cloudflare Email Routing to accept incoming messages for configured addresses at `@codebihin.in` and forward them to verified existing inboxes such as Gmail.

It does **not** provide:
- A mailbox or inbox hosted by CodeBihin
- IMAP/POP access
- Sending or replying as `@codebihin.in`
- Unlimited storage or independent employee mailboxes

When an employee replies to a forwarded message, the reply comes from their destination Gmail address, not their CodeBihin address.

## Services

- GitHub Pages: hosts the static CodeBihin Email portal.
- Firebase Authentication: authenticates provisioned CodeBihin users.
- Firestore: stores employee/role data under restrictive rules.
- Cloudflare Email Routing: receives and forwards incoming mail.
- Existing Gmail accounts: receive the forwarded messages.

## Important DNS requirement

Cloudflare Email Routing requires the domain to use Cloudflare DNS. The domain registrar can remain Hostinger, but its authoritative nameservers must be changed to the two nameservers Cloudflare assigns.

**Do not change nameservers or MX records until the current DNS zone has been copied and reviewed.** Record all existing A, AAAA, CNAME, MX, TXT, CAA, and SRV records first. A nameserver migration can break websites, verification records, or other subdomains if records are not copied correctly.

Also check whether any existing service currently receives mail for `codebihin.in`. Cloudflare Email Routing uses the domain's MX records; replacing existing MX records can interrupt that service. Do not enable routing until this conflict is understood.

## Setup sequence

1. Create a free Cloudflare account and add `codebihin.in`.
2. Let Cloudflare scan/import DNS records. Compare the imported zone against Hostinger's live DNS zone and manually add anything missing.
3. Keep all website records, including the GitHub Pages custom-domain record for `tool.codebihin.in`, intact. Do not proxy mail-related records.
4. Only after the DNS inventory is verified, change the domain's nameservers at Hostinger to the exact pair Cloudflare provides.
5. Wait until Cloudflare reports the zone as Active.
6. In Cloudflare, open **Compute → Email Service → Email Routing** and onboard `codebihin.in`.
7. Add a destination address (for example, an existing Gmail inbox) and complete its verification email.
8. Create explicit routing rules, such as:
   - `admin@codebihin.in` → verified administrator Gmail
   - `support@codebihin.in` → verified support Gmail
   - `careers@codebihin.in` → verified HR Gmail
9. Test each address by sending from a separate external email account. Check Inbox and Spam.
10. Keep a written list of each alias and its destination. Do not create catch-all forwarding until spam and ownership risks have been considered.

Cloudflare may add MX and TXT records during onboarding. Review them before accepting changes. Do not manually invent MX, SPF, or DKIM values; use the values Cloudflare displays for this zone.

## Security and operations

- Verify every destination address before enabling a routing rule.
- Use one destination per alias unless a Worker-based multi-destination workflow is deliberately implemented.
- Do not publish employee destination Gmail addresses in the public website.
- Do not store passwords or Firebase service-account keys in GitHub.
- Keep Firebase Authentication account provisioning restricted to administrators.
- Email forwarding does not guarantee delivery; check spam folders and routing logs.
- Forwarding can be affected by recipient-provider spam and DMARC policies.

## Current app status

The GitHub Pages portal and Firebase sign-in are separate from Cloudflare's mail routing. Signing into the portal does not create a mailbox or automatically create a forwarding rule. Alias creation and destination verification are performed in Cloudflare in this initial release.

## Official documentation

- [Cloudflare: Route emails](https://developers.cloudflare.com/email-service/get-started/route-emails/)
- [Cloudflare: Domain configuration and DNS records](https://developers.cloudflare.com/email-service/configuration/domains/)
- [Cloudflare: Routing rules and destination addresses](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/)
- [Cloudflare: Email service limitations](https://developers.cloudflare.com/email-service/platform/limits/)
