# Calgary Crocs public website

Run `bun run dev` from `site` (port 3001). Run `bun run check` for TypeScript, Biome, design boundaries, motion tokens, and tests. The club app remains in `app`.

## Production

Vercel project `calgary-crocs` serves `calgaryuwh.com`, with root directory `site`, Bun installation, and `bun run build`.

Website signups are email inquiries, not account creation or payment registration. The server's `/api/interest` route validates submissions and sends through Resend to `hello@calgaryuwh.com`. Reply-To is the visitor's email. Set `RESEND_API_KEY` as a server-only production secret. The form has no Convex or Cloudflare dependency.

Vercel Firewall limits inquiry POST requests to five attempts per IP per hour. The route also enforces same-origin requests, payload limits, a honeypot, and the Calgary booking cutoff. Resend idempotency prevents identical messages from being sent twice within 24 hours. Email text and minimally formatted HTML come from the same sections.

All signup buttons open one shared modal. Closing it preserves the draft for the current page session. Dropdown menus allow scrolling and close on selection.

## Content

The page uses bundled content by default. Optional legacy content editing requires `CONVEX_URL`, `WEBSITE_SERVER_KEY` (shared with Convex), and `WEBSITE_ADMIN_PASSWORD`; these are not configured on the production site. Never deploy local editor credentials.

Coaches are disabled through `lib/features.ts`; retain the TODO and profiles for re-enabling later. Policy documents live in `public/policies`.

The original supplied photo is `public/hockey.jpg`. The AI-assisted selective motion-blur version is `hockey-action.png`; the optimized served image is `hockey-action.webp`.
