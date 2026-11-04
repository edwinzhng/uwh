import type { ReactElement } from "react";
import { materials } from "./materials";
import { motionEffects } from "./motion";
import { brand, motion, radius, space } from "./tokens";

export const DesignTokens = (): ReactElement => (
	<style>{`:root {
 --uwhclub-ink: ${brand.ink};
 --uwhclub-accent: ${brand.accent};
 --uwhclub-surface: ${brand.surface};
 --uwhclub-font: ${brand.font};
 --uwhclub-control-radius: ${radius.xs}px;
 --uwhclub-panel-radius: ${radius.lg}px;
 --uwhclub-space-sm: ${space.sm}px;
 --uwhclub-space-lg: ${space.lg}px;
${Object.entries({ ...motion.duration, ...motionEffects })
	.map(([name, value]) => ` --uwhclub-motion-${name}: ${value}ms;`)
	.join("\n")}
${Object.entries(motion.easing)
	.map(
		([name, value]) =>
			` --uwhclub-ease-${name}: cubic-bezier(${value.join(",")});`,
	)
	.join("\n")}
 --uwhclub-motion-ease: cubic-bezier(${motion.easing.out.join(",")});
 --uwhclub-glass: ${materials.light.floating};
 --uwhclub-glass-blur: ${materials.blur.floating}px;
}
@media (prefers-reduced-motion: reduce) { :root { ${Object.keys({
		...motion.duration,
		...motionEffects,
	})
		.map((name) => `--uwhclub-motion-${name}: 0ms;`)
		.join(" ")} } }`}</style>
);
