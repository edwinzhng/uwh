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
		<Grid gap="md">
			<Field
				label="RSVP opens · days before"
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
			0 days opens immediately when a session is created.
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
			Explicit answers are never overwritten. Program defaults update future
			program-managed sessions; individually edited sessions keep their
			overrides.
		</Text>
	</Stack>
);
