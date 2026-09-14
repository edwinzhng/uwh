# Calgary Underwater Hockey

- `site/`: public landing page (Next.js), deployed to calgaryuwh.com.
- `app/`: shared club application (Expo for web, iOS, and Android), deployed to app.calgaryuwh.com.
- `packages/`: shared design system and utilities.
- `legacy/`: preserved original Next.js application and its separate Convex backend.

Run `bun run dev` for the club app or `bun run dev:site` for the landing page. Each project has its own dependencies; run `bun install --frozen-lockfile` inside the project before starting it.

Vercel projects use root directories `site` and `app`. Enable inclusion of source files outside the root directory so shared packages are available. Build settings are in each project's `vercel.json`. Connect both projects to this repository with `main` as the production branch for automatic deployments.

The club application shares platform-independent code and uses platform-specific files where needed. Separate web and mobile projects are not necessary.
