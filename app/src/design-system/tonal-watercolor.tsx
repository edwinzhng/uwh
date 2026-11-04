import type { ReactElement } from "react";
import type { CategoryColor } from "./tokens";
import { WatercolorShader } from "./watercolor-shader";
import {
	useWatercolorTuning,
	WatercolorTuningContext,
	watercolorDefaults,
} from "./watercolor-tuning";

export const TonalWatercolor = ({
	category,
	seed,
}: {
	category: CategoryColor;
	seed: string;
}): ReactElement => {
	const tuning = useWatercolorTuning() ?? watercolorDefaults;
	return (
		<WatercolorTuningContext value={{ ...tuning, intensity: 0.14, grain: 0.3 }}>
			<WatercolorShader category={category} seed={seed} />
		</WatercolorTuningContext>
	);
};
