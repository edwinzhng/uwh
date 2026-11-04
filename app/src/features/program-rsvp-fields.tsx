import type { ReactElement } from "react";
import {
	Field,
	Grid,
	Select,
	Stack,
	Text,
	TimeSelector,
} from "../design-system";
import type { ProgramRsvp } from "../domain/programs";

export const ProgramRsvpFields = ({
	value,
	onChange,
	disabled,
}: {
	value: ProgramRsvp;
	onChange: (rsvp: ProgramRsvp) => void;
	disabled: boolean;
}): ReactElement => (
	<Stack>
		<Select
			label="Registration opening"
			value={value.openRule ?? "before-event"}
			options={[
				{ value: "before-event", label: "Before each event" },
				{ value: "weekly", label: "Weekly" },
			]}
			onValueChange={(openRule): void => {
				if (openRule)
					onChange({
						...value,
						openRule,
						openWeekday:
							openRule === "weekly" ? (value.openWeekday ?? 7) : undefined,
						openDays:
							openRule === "weekly"
								? Math.max(14, value.openDays)
								: value.openDays,
					});
			}}
			isDisabled={disabled}
		/>
		{value.openRule === "weekly" ? (
			<Select
				label="Opening day"
				value={String(value.openWeekday ?? 7)}
				options={[
					{ value: "7", label: "Sunday" },
					{ value: "1", label: "Monday" },
					{ value: "2", label: "Tuesday" },
					{ value: "3", label: "Wednesday" },
					{ value: "4", label: "Thursday" },
					{ value: "5", label: "Friday" },
					{ value: "6", label: "Saturday" },
				]}
				onValueChange={(day): void => {
					if (day) onChange({ ...value, openWeekday: Number(day) });
				}}
				isDisabled={disabled}
			/>
		) : undefined}
		<Grid gap="md">
			<Field
				label={
					value.openRule === "weekly"
						? "Open events less than · days away"
						: "RSVP opens · days before"
				}
				inputMode="numeric"
				value={String(value.openDays)}
				onValueChange={(days): void =>
					onChange({ ...value, openDays: Number(days) })
				}
				isDisabled={disabled}
			/>
			<TimeSelector
				label="Opening time"
				isDisabled={disabled}
				value={value.openTime}
				onValueChange={(time): void =>
					onChange({ ...value, openTime: time ?? "" })
				}
			/>
		</Grid>
		<Text variant="caption" tone="secondary">
			{value.openRule === "weekly"
				? "Uses calendar days and the club’s time zone."
				: "0 days opens immediately when a session is created."}
		</Text>
		<Grid gap="md">
			<Field
				label="RSVP closes · days before"
				inputMode="numeric"
				value={String(value.closeDays)}
				onValueChange={(days): void =>
					onChange({ ...value, closeDays: Number(days) })
				}
				isDisabled={disabled}
			/>
			<TimeSelector
				label="Closing time"
				isDisabled={disabled}
				value={value.closeTime}
				onValueChange={(time): void =>
					onChange({ ...value, closeTime: time ?? "" })
				}
			/>
		</Grid>
		<Field
			label="Reminder · days before"
			inputMode="numeric"
			value={String(value.reminderDays)}
			onValueChange={(days): void =>
				onChange({ ...value, reminderDays: Number(days) })
			}
			isDisabled={disabled}
		/>
		<Select
			label="If a roster member has not answered at closing"
			value={value.defaultResponse}
			options={[
				{ value: "none", label: "Leave unanswered" },
				{ value: "going", label: "Mark going · respect capacity" },
				{ value: "unavailable", label: "Mark unavailable" },
			]}
			onValueChange={(defaultResponse): void => {
				if (defaultResponse) onChange({ ...value, defaultResponse });
			}}
			isDisabled={disabled}
		/>
		<Text variant="small" tone="secondary">
			Explicit answers and individual time overrides are preserved.
		</Text>
	</Stack>
);
