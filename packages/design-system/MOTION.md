# Motion

`src/motion.ts` is the shared contract, synchronized with the Rec monorepo's `libs/recess/src/motion/index.ts`. Keep the values aligned; do not add one-off tokens for individual components.

Durations in milliseconds: `instant` 0, `fast` 150, `standard` 200, `slow` 300, `extended` 500. Easing tokens: `standard`, `out`, `in-out`, `emphasized`, and `linear`. Curves are defined in the shared contract.

The user-requested liquid shader release uses `motionEffects.liquidRelease` (1000ms). This effect-specific token leaves the Rec duration scale unchanged. Scrolling must not interrupt that release fade.

The user-requested landing hero sequence uses `motionEffects.heroCopyReveal` (1900ms) with overlapping delays of 0, 150, 300, and 500ms, finishing at 2400ms. The image fades over `extended` (500ms) once decoded.

Use `motion.duration` and `motion.easing` in app components. Libraries expecting seconds should use `motionDurationSeconds`. CSS uses generated `--crocs-motion-*` and `--crocs-ease-*` variables. Never inline duration numbers, easing curves, or CSS timing keywords in component animations. Timers for notification dwell or backend work are not animation timings.

Page and tab content fades use `slow` (300ms) with `out`. Wrap the entire page, including its header; persistent navigation stays stable. Prefer opacity and transform, reserve layout space before loading, and respect reduced motion. Do not derive custom timings by multiplying tokens.

Landing-page route exits use `standard` (200ms), as requested; incoming pages retain `slow` (300ms) with `out`. Start the incoming animation after the destination mounts and its scroll position settles.

Run `bun run check:motion` in both `app` and `site`. These checks also run through the design boundary checks and production builds. Regression coverage lives in `app/tests/motion-tokens.test.ts`.
