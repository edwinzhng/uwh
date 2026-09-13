# Website design system

Product UI in `app`, `components`, `src`, and `lib` composes the public exports from `design-system/index.ts`. Raw HTML, Next visual primitives, DOM construction, style/class overrides, polymorphic HTML tags, and JSX prop spreads belong only in design-system implementations. The document adapter owns root markup and global CSS.

Use semantic primitives for text, headings, content sections, grids, forms, fields, and actions. Reuse composites for navigation, dialogs, profile cards, document lists, schedules, locations, and media. Pass product content and handlers as props; keep fetches, routing decisions, and registration/editor state in product components. Controls reuse the shared `packages/design-system` implementations and tokens.

Run `bun run check` for types, Biome, design boundaries, and regression tests. Production builds also run `check:design`. The mobile app independently enforces the same boundary around `src/design-system` and checks it before web export.
