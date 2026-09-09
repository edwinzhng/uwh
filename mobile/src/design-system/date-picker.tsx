import type { ReactElement } from "react";
import type { DatePickerProps } from "./date-time-props";
import { dateFromValue, dateToValue, formatDate } from "./date-time-values";
import { NativeDateTimePicker } from "./native-date-time-picker";

export const DatePicker = ({
	label,
	value,
	min,
	max,
	isDisabled,
	onValueChange,
}: DatePickerProps): ReactElement => (
	<NativeDateTimePicker
		label={label}
		value={dateFromValue(value) ?? new Date()}
		displayValue={formatDate(value)}
		mode="date"
		minimumDate={dateFromValue(min)}
		maximumDate={dateFromValue(max)}
		isDisabled={isDisabled}
		canClear={Boolean(value)}
		onValueChange={(date): void =>
			onValueChange(date ? dateToValue(date) : undefined)
		}
	/>
);
