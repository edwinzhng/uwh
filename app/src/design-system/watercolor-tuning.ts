import { createContext, useContext } from "react";
export type WatercolorTuning = {
	grain: number;
	speed: number;
	smoothness: number;
	intensity: number;
};
export const watercolorDefaults: WatercolorTuning = {
	grain: 0.7,
	speed: 0.25,
	smoothness: 1,
	intensity: 0.35,
};
export const watercolorParameter = (
	input: string | undefined,
	fallback: number,
	max = 1,
): number => {
	const value =
		input === undefined || input.trim() === "" ? Number.NaN : Number(input);
	return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
};
export const WatercolorTuningContext = createContext<
	WatercolorTuning | undefined
>(undefined);
export const useWatercolorTuning = (): WatercolorTuning | undefined =>
	useContext(WatercolorTuningContext);
