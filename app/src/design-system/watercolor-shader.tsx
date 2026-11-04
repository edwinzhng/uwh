import type { ReactElement } from "react";
import { MaterialTexture } from "./material-texture";
import type { CategoryColor } from "./tokens";
export const WatercolorShader = ({
	category,
}: {
	category: CategoryColor;
	seed?: string;
}): ReactElement => (
	<MaterialTexture category={category} animated={false} rounded={false} />
);
