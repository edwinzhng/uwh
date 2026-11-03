import type { ReactElement } from "react";
import {
	DatePicker,
	Field,
	Grid,
	Select,
	Stack,
	TimeSelector,
	Toggle,
} from "../design-system";
import type { ProgramSchedule } from "../domain/programs";

export const ProgramScheduleFields = ({
	value,
	initial,
	onChange,
	disabled,
}: {
	value?: ProgramSchedule;
	initial: ProgramSchedule;
	onChange: (schedule?: ProgramSchedule) => void;
	disabled: boolean;
}): ReactElement => (
	<Stack>
		<Toggle
			label="Create weekly sessions"
			value={Boolean(value)}
			onValueChange={(enabled): void => onChange(enabled ? initial : undefined)}
			isDisabled={disabled}
		/>
		{value ? (
			<>
				<Grid gap="md">
					<DatePicker
						label="First date"
						isDisabled={disabled}
						value={value.startDate}
						onValueChange={(startDate): void =>
							onChange({ ...value, startDate: startDate ?? "" })
						}
					/>
					<DatePicker
						label="Last date"
						isDisabled={disabled}
						value={value.endDate}
						onValueChange={(endDate): void =>
							onChange({ ...value, endDate: endDate ?? "" })
						}
					/>
				</Grid>
				<Select
					label="Weekday"
					value={String(value.weekday)}
					options={[
						"Monday",
						"Tuesday",
						"Wednesday",
						"Thursday",
						"Friday",
						"Saturday",
						"Sunday",
					].map((label, index) => ({ value: String(index + 1), label }))}
					onValueChange={(weekday): void =>
						onChange({ ...value, weekday: Number(weekday) })
					}
					isDisabled={disabled}
				/>
				<Grid gap="md">
					<TimeSelector
						label="Start"
						isDisabled={disabled}
						value={value.start}
						onValueChange={(start): void =>
							onChange({ ...value, start: start ?? "" })
						}
					/>
					<TimeSelector
						label="End"
						isDisabled={disabled}
						value={value.end}
						onValueChange={(end): void =>
							onChange({ ...value, end: end ?? "" })
						}
					/>
				</Grid>
				<Field
					label="Venue"
					value={value.venue}
					onValueChange={(venue): void => onChange({ ...value, venue })}
					isDisabled={disabled}
				/>
			</>
		) : undefined}
	</Stack>
);
