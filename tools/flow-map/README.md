- **UWH user flows**

- Standalone reference site, grouped by feature and persona. Source: current app feature screens, domain access rules and review controllers as of 3 November 2026. Administrator coverage intentionally focuses on registration, manual payments and the missing electronic waiver workflow; equipment has one staff-only flow.

- `flows.ts` owns the inventory and fictional review-screen routes. `build.ts` emits the single-page site using `style.css`; `client.ts` owns persona filtering, viewport selection and a single bounded live preview. Run `bun build.ts` from this directory after editing. Generated `dist` is excluded from Git. Preserve its frozen app export and captured phone/desktop images with the published reference; rebuilding the inventory does not replace those dependencies.

- The reference maps implemented UI, not production delivery readiness. Authenticated account-security screens do not render in the fictional preview. Electronic waiver signatures and online payment checkout are absent. Expanded flows show available distinct page/sheet states, not an exhaustive capture of every keystroke or confirmation. Use Interact to explore the actual review app with fictional data; it never uses production accounts.

- Source owners consulted: `app/src/features`, `app/src/domain`, `app/review/product-flows.ts`, `app/docs/README.md`, `app/docs/engineering/README.md` and `app/docs/PRODUCT-SPEC.md` (historical planning and access-matrix context checked against screens).
