# Calgary Crocs design system

`@calgarycrocs/design-system` is private shared source for the Next.js site and Expo app. It needs no registry publishing or separate deployment.

- `/tokens`: color scales, typography, spacing, radii, layers, shadows, motion, and brand values.
- `/materials`: light/dark translucent surfaces.
- `/button`, `/field`, `/segmented-control`, `/glass-backdrop`: web primitives.
- `/theme`: CSS variables generated from the shared tokens.
- `/liquid-lens`: optional web shader with `imageSrc`, `areaSelector`, and `className` props.

The app's native controls re-export the shared foundations through `mobile/src/design-system`. Native controls keep native accessibility and Reanimated behavior; native bundles never import the web shader.

The lens parent must be positioned and have a size. Supply `areaSelector` to track an ancestor instead. Keep interactive content above the canvas. Images must be same-origin or allow CORS. Rendering stops after pointer exit, window blur, or document hiding. Reduced-motion and coarse-pointer users retain the static surface.

Run `bun install` in both consumers after adding package files. Existing source files are linked, so edits propagate directly. Next uses a TypeScript source mapping to avoid Turbopack's incompatibility with Bun's symlinked package manifest. Metro uses the local package dependency and resolves React from the app to keep a single runtime.

For Vercel, include source outside each project's root directory so both builds can access `packages/design-system`. Build roots remain `site` and `mobile`.

Validate with `bun run typecheck` in both apps, `bun run check:design` in mobile, `bun run build` in site, and `bun x expo export --platform web` in mobile.

Action feedback guidance: see `mobile/docs/DESIGN-SYSTEM.md`, Action feedback. Use the platform adapter and catalog rather than importing toast libraries in feature code.
