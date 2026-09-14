import type { ReactElement } from "react";
import { GlassBackdrop } from "./glass-backdrop";

export const NavigationHighlight = (): ReactElement => (
	<GlassBackdrop material="selection" />
);
