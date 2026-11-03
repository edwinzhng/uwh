import { geometry } from "./tokens";

export type PickerLayoutKind = "field" | "action";

export const pickerTriggerWidth = ({
	inDialog = false,
	compact = false,
	icon = false,
	kind = "field",
	availableWidth,
}: {
	inDialog?: boolean;
	compact?: boolean;
	icon?: boolean;
	kind?: PickerLayoutKind;
	availableWidth?: number;
}): number | "100%" =>
	icon
		? geometry.touch
		: compact
			? geometry.compactPickerWidth
			: inDialog && kind === "field"
				? availableWidth !== undefined &&
					Number.isFinite(availableWidth) &&
					availableWidth > 0
					? availableWidth
					: "100%"
				: geometry.popupWidth;
