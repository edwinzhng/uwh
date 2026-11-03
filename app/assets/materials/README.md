# Card materials

Independent, reduced-strength reconstructions of the published [Fluid Pastels](https://shaders.com/collection/fluid-pastels) and [Watercolor on Paper](https://shaders.com/collection/watercolor-on-paper) treatments. These are not exported Pro presets.

The swirl field adapts MIT-licensed `flowLayers` from [Shader Effects](https://github.com/shader-effects-inc/shaders/blob/9eb037d8db63a0783f67d58ce7291726d698933f/packages/core/src/gpu/kit/gradientPaints.ts), copyright 2026 Shader Effects Inc. See `Shader-Effects-MIT.txt`. Watercolor reconstructs the publicly described multipoint blue/purple/peach/pink wash, wave distortion and fine paper texture. It does not include the site's cursor simulation or licensed preset source.

Run `bun scripts/generate-card-materials.ts` from `app` to regenerate the 56 256px RGB PNGs: seven category palettes, two treatments, two themes and two phases. The images contain final theme-adjusted colors, validated against each category's paired text. Page backgrounds reuse their section's textures at lower strength and fade to the canvas halfway down the viewport. Neutral cards remain plain. Each instance has a deterministic starting phase, reflection and offset.

Native and web surfaces share bundled images and one composited opacity/transform clock. There is no per-card canvas, shader context or layout measurement. Reduced motion freezes the material; backgrounding cancels the clock. Plain appearance removes the material entirely. Inactive screens detach animated styles from the clock. The previous Paper/ExpoGL renderer and eager texture warmup have been removed.
