import { GlassBackdrop as SharedGlassBackdrop } from "@calgarycrocs/design-system/glass-backdrop";
import type { ReactElement } from "react";
import type { GlassMaterial } from "./materials";
import { useTheme } from "./theme";

export const GlassBackdrop = ({
	material,
}: {
	material: GlassMaterial;
}): ReactElement => {
	const theme = useTheme();
	return (
		<SharedGlassBackdrop
			material={material}
			theme={theme.background.primary === "#FFFFFF" ? "light" : "dark"}
		/>
	);
};
