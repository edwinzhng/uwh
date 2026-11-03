# Fonts

The app bundles Barlow Condensed Bold from the official Google Fonts repository for Club Performance display titles and numbers. Its SIL Open Font License is included as `barlow-condensed-OFL.txt`.

Inter Regular, Medium, and Semibold remain the reading and control families. `src/design-system/fonts.ts` registers the bundled files for native and web; fonts are not fetched at runtime and weights are not synthesized.
