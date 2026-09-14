import { materials } from "@calgarycrocs/design-system/materials";

export {
	type GlassMaterial,
	materials,
} from "@calgarycrocs/design-system/materials";

import type { Theme } from "./tokens";
export const materialColors = (
	theme: Theme,
): (typeof materials)["light" | "dark"] =>
	theme.background.primary === "#FFFFFF" ? materials.light : materials.dark;
