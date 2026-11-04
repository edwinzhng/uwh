import type { ReactElement } from "react";
import {
	Field,
	Grid,
	Select,
	Stack,
	Text,
	TimeSelector,
	Toggle,
} from "../design-system";
import { programOpeningSchedule } from "../domain/program-rsvp";
import type { ProgramRsvp } from "../domain/programs";

export const ProgramRsvpFields = ({
	value,
	onChange,
	disabled,
	weekday = 1,
}: {
	value: ProgramRsvp;
	onChange: (rsvp: ProgramRsvp) => void;
	disabled: boolean;
	weekday?: number;
}): ReactElement => {
	const season =
		value.openRule === "season" ||
		(value.openRule !== "weekly" && value.openDays === 0);
	const { weekday: openingDay, weeks } = programOpeningSchedule(value, weekday);
	const scheduled = {
		...value,
		openRule: "weekly",
		openWeekday: openingDay,
		openWeeks: weeks,
	} satisfies ProgramRsvp;
	return (
		<Stack>
			<Select
				label="Registration opening"
				value={season ? "season" : "weekly"}
				options={[
					{ value: "season", label: "Full season · open now" },
					{ value: "weekly", label: "Scheduled opening" },
				]}
				onValueChange={(rule): void => {
					if (rule === "season")
						onChange({
							...value,
							openRule: "season",
							openDays: 0,
							openWeeks: undefined,
						});
					else if (rule === "weekly")
						onChange({ ...scheduled, openWeeks: Math.max(1, weeks) });
				}}
				isDisabled={disabled}
			/>
			{!season ? (
				<>
					<Grid gap="md">
						<Select
							label="Day of week"
							value={String(openingDay)}
							options={[
								"Monday",
								"Tuesday",
								"Wednesday",
								"Thursday",
								"Friday",
								"Saturday",
								"Sunday",
							].map((label, index) => ({ value: String(index + 1), label }))}
							onValueChange={(day): void => {
								if (day) onChange({ ...scheduled, openWeekday: Number(day) });
							}}
							isDisabled={disabled}
						/>
						<Field
							label="Weeks before"
							inputMode="numeric"
							value={String(weeks)}
							onValueChange={(input): void =>
								onChange({ ...scheduled, openWeeks: Number(input) })
							}
							isDisabled={disabled}
						/>
						<TimeSelector
							label="Opening time"
							value={value.openTime}
							onValueChange={(time): void =>
								onChange({ ...scheduled, openTime: time ?? "" })
							}
							isDisabled={disabled}
						/>
					</Grid>
					<Text variant="caption" tone="secondary">
						Weeks run Monday–Sunday in the club’s time zone.
					</Text>
				</>
			) : undefined}
			{!season ? (
				<Toggle
					label="Send notification when registration opens"
					value={value.notifyOnOpen !== false}
					onValueChange={(notifyOnOpen): void =>
						onChange({ ...value, notifyOnOpen })
					}
					isDisabled={disabled}
				/>
			) : undefined}
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
					value={value.closeTime}
					onValueChange={(time): void =>
						onChange({ ...value, closeTime: time ?? "" })
					}
					isDisabled={disabled}
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
					{ value: "unavailable", label: "Mark unavailable" },
					{ value: "none", label: "Leave unanswered" },
					{ value: "going", label: "Mark going · respect capacity" },
				]}
				onValueChange={(defaultResponse): void => {
					if (defaultResponse) onChange({ ...value, defaultResponse });
				}}
				isDisabled={disabled}
			/>
		</Stack>
	);
};
