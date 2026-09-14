import type { ReactElement } from "react";
import type { TimeSelectorProps } from "./date-time-props";
import { formatTime, timeFromDate, timeToDate } from "./date-time-values";
import { NativeDateTimePicker } from "./native-date-time-picker";

export const TimeSelector = ({
	label,
	value,
	isDisabled,
	onValueChange,
}: TimeSelectorProps): ReactElement => (
	<NativeDateTimePicker
		label={label}
		value={timeToDate(value)}
		displayValue={formatTime(value) || "Choose time"}
		mode="time"
		isDisabled={isDisabled}
		canClear={Boolean(value)}
		onValueChange={(date): void =>
			onValueChange(date ? timeFromDate(date) : undefined)
		}
	/>
);
