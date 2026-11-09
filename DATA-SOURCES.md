# Data sources

## IP-to-organisation table
- Source: [iptoasn.com](https://iptoasn.com) `ip2asn-v4.tsv.gz` (IPv4 range -> ASN -> AS description).
- Licence: Public Domain Dedication and License (PDDL) per the site's terms. Re-check the terms on the download page before relying on this.
- Not committed. `npm run build` (via `prebuild`) downloads it and runs `scripts/build-ip-orgs.ts`, which keeps education/government
  descriptions and a short list of major cloud ASNs, and writes `public/data/ip-orgs.json` (gitignored, about 180 KB gzipped).
- The app fetches it from its own origin, only when OCR finds an IPv4-looking word. IPv6 is not covered yet.
- Tests use a tiny synthetic table (documentation ranges, fake orgs). No real data in the repo.
- Caveat: an AS owner is not always who runs the host in a screenshot (e.g. a cloud IP). The label says "belongs to", not "is run by".
