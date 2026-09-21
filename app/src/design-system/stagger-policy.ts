import { motionEffects } from "@calgarycrocs/design-system/tokens";

export const staggerDelay = (index: number): number | undefined =>
	Number.isInteger(index) && index >= 0 && index < 4
		? Math.min(
				index * motionEffects.scheduleStaggerStep,
				motionEffects.scheduleStaggerLimit,
			)
		: undefined;
