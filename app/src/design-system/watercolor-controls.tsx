import type { ReactElement } from "react";
import { Text } from "./text";
import type { WatercolorTuning } from "./watercolor-tuning";
export type WatercolorControlsProps = {
	value: WatercolorTuning;
	onChange: (next: WatercolorTuning) => void;
	onCommit: (next: WatercolorTuning) => void;
};
export const WatercolorControls = (
	_props: WatercolorControlsProps,
): ReactElement => <Text>Open this tuning page in a browser.</Text>;
