# Calgary Crocs public website

Run `bun run dev` from `site` (port 3001). The existing club app remains in `mobile`.

The website uses the existing mobile Convex deployment. Start it using `bun run backend` in `mobile`. Content and enquiries are stored in separate website tables.

Local editor: `/admin`. The local-only preview password is in `.env.local` (`WEBSITE_ADMIN_PASSWORD`). Never reuse this password for deployment.

## Vercel

Create a Next.js project with Root Directory `site`. Install with Bun, build with `bun run build`. Set:

- `CONVEX_URL`: hosted deployment URL of the mobile backend
- `WEBSITE_SERVER_KEY`: a random server-only secret, also set on that Convex deployment
- `WEBSITE_ADMIN_PASSWORD`: a strong private editor password
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Turnstile keys with the production hostname allowed

Production form submission fails closed without Turnstile configuration. Enquiries are stored in the private dashboard, not emailed. The registration option is an enquiry, not completed membership/payment registration. Document entries link to existing HTTPS files. Add real coach profiles and document links in the editor before launch. No generated video is included.

The original supplied photo is `public/hockey.jpg`. The AI-assisted selective motion-blur version is `hockey-action.png`; the optimized served image is `hockey-action.webp`.

The site's pass-through proxy keeps the parent coaching application's sign-in middleware out of the public site. Editing and enquiry access are checked server-side in the site routes and Convex functions.
