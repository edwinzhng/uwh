# Club logo

`club-logo.png` is the Calgary Crocs submark published as the Apple touch icon on https://www.calgaryuwh.com/.

Source: https://cdn.prod.website-files.com/65ac2bd26aa5617c47b809ca/660791ddf8fc9b2b4588cc00_CC_LOGO_SUBMARK_RGB_FULLCOLOUR%20(1).png

Retrieved September 8, 2026. The original file is bundled with the app so the header does not depend on the website being reachable.

# Sign-in backdrop

`auth-backdrop-source.jpg` is the original underwater hockey photo. Its embedded metadata credits Josh Curran Photography (2013).

`auth-backdrop.jpg` is the tall sign-in backdrop built from it by `bun scripts/build-auth-backdrop.ts`: the photo sits in the middle of a tall canvas and the pool continues around it as generated tiles, lane stripes and caustics that line up with the photo's own. If you rebuild it with different dimensions, update `authBackdropPhoto` in `src/design-system/auth-backdrop-geometry.ts`.
