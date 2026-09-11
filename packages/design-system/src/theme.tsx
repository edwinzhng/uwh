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
 --crocs-motion-standard: ${motion.duration.standard}ms;
 --crocs-motion-ease: cubic-bezier(${motion.easing.out.join(",")});
 --crocs-glass: ${materials.light.floating};
 --crocs-glass-blur: ${materials.blur.floating}px;
}
@media (prefers-reduced-motion: reduce) { :root { --crocs-motion-standard: 0ms; } }`}</style>
);
