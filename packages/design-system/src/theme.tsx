import type { ReactElement } from "react";
import { materials } from "./materials";
import { brand, motion, radius, space } from "./tokens";

export const DesignTokens = (): ReactElement => (
	<style>{`:root {
 --crocs-ink: ${brand.ink};
 --crocs-accent: ${brand.accent};
 --crocs-surface: ${brand.surface};
 --crocs-font: ${brand.font};
 --crocs-control-radius: ${radius.xs}px;
 --crocs-panel-radius: ${radius.lg}px;
 --crocs-space-sm: ${space.sm}px;
 --crocs-space-lg: ${space.lg}px;
${Object.entries(motion.duration)
	.map(([name, value]) => ` --crocs-motion-${name}: ${value}ms;`)
	.join("\n")}
${Object.entries(motion.easing)
	.map(
		([name, value]) =>
			` --crocs-ease-${name}: cubic-bezier(${value.join(",")});`,
	)
	.join("\n")}
 --crocs-motion-ease: cubic-bezier(${motion.easing.out.join(",")});
 --crocs-glass: ${materials.light.floating};
 --crocs-glass-blur: ${materials.blur.floating}px;
}
@media (prefers-reduced-motion: reduce) { :root { ${Object.keys(motion.duration)
		.map((name) => `--crocs-motion-${name}: 0ms;`)
		.join(" ")} } }`}</style>
);
