import type { GlassMaterial } from "./materials";

export type GlassBackdropProps = {
	material: GlassMaterial;
	showRim?: boolean;
	radius?: number;
	softEdge?: boolean;
	uniform?: boolean;
};
