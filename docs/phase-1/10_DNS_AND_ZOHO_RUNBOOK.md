# 10 · DNS and Zoho Mail runbook

Needs the client's domain registrar login (or the client doing the steps while you watch). Do this after the Vercel project exists. Spec: PRD section 6.1, DNS-1 to DNS-7.

## Before you start
- [ ] Domain name decided with the client: ______________
- [ ] Who holds the registrar login: ______________
- [ ] Zoho Mail account created for the domain, and its data centre noted (`.com`, `.eu`, `.in` and so on). The hosts below are for `.com`. If it is another one, use what Zoho shows.

## Steps
1. **Vercel.** Project, Settings, Domains, add the domain and `www`. Vercel shows the exact records. Use those if they differ from the ones here.
2. **Website records.** `A` for the apex to `76.76.21.21`. `CNAME` for `www` to `cname.vercel-dns.com`.
3. **Zoho verification.** In Zoho Mail admin, add the domain. Copy the `TXT` verification record it gives and add it. Press Verify in Zoho.
4. **Mail records (MX).** `mx.zoho.com` priority 10, `mx2.zoho.com` priority 20, `mx3.zoho.com` priority 50.
5. **SPF.** `TXT` on the apex: `v=spf1 include:zoho.com ~all`. Keep one SPF record only. If one already exists, merge it.
6. **DKIM.** In Zoho, open the DKIM page, pick a selector (for example `zmail`), copy the public key. Add `TXT` at `zmail._domainkey` with that value.
7. **DMARC (later).** `TXT` at `_dmarc`: `v=DMARC1; p=none`. Tighten after two clean weeks.
8. **Site setting.** In Vercel, set `NEXT_PUBLIC_SITE_URL` to `https://<domain>` and redeploy. Edit links and referral links use it.

## Acceptance (DNS-7)
- [ ] The website loads on the domain and on `www`, with HTTPS.
- [ ] A mail sent from a Zoho mailbox on the domain reaches Gmail. In "Show original", SPF and DKIM both say PASS.
- [ ] A mail sent from Gmail to the Zoho mailbox arrives.
- [ ] `/list?ref=<code>` works on the live domain and the referral cookie is set.

## If something fails
- Records not seen: DNS can take up to a few hours. Check with `dig TXT <domain>` or an online DNS checker.
- SPF fails: there are two SPF records. Merge them into one.
- Site shows the registrar page: the `A` record or `www` record is wrong, or an old record is still there. Remove the old one.
