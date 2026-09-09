import type { ReactElement } from "react";
import { Field, Grid, Select, Stack, Toggle } from "../design-system";
import type { EventDraft } from "../domain/app-types";
import { EventEligibility } from "./event-eligibility";

export const EventOptions = ({
	draft,
	onChange,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
}): ReactElement => (
	<Stack>
		<Toggle
			label="Show on public schedule"
			description="Shares title, time and venue. Details and attendees stay private."
			value={draft.public ?? false}
			onValueChange={(value): void => onChange({ ...draft, public: value })}
		/>
		<Field
			label="Capacity"
			inputMode="numeric"
			value={String(draft.capacity)}
			onValueChange={(value): void =>
				onChange({ ...draft, capacity: Number(value) })
			}
		/>
		<EventEligibility
			value={draft.eligiblePersonIds}
			onChange={(eligiblePersonIds): void =>
				onChange({ ...draft, eligiblePersonIds })
			}
		/>
		<Field
			label="Details"
			value={draft.description}
			onValueChange={(description): void => onChange({ ...draft, description })}
			multiline
		/>
		<Grid gap="md">
			<Select
				label="Registration opens"
				value={draft.signupOpens ?? "now"}
				options={[
					{ value: "now", label: "Immediately" },
					{ value: "three-days", label: "3 days before" },
					{ value: "week", label: "1 week before" },
				]}
				onValueChange={(signupOpens): void =>
					onChange({ ...draft, signupOpens })
				}
			/>
			<Select
				label="Registration closes"
				value={draft.signupCloses ?? "start"}
				options={[
					{ value: "start", label: "At the start" },
					{ value: "hour", label: "1 hour before" },
					{ value: "day", label: "1 day before" },
				]}
				onValueChange={(signupCloses): void =>
					onChange({ ...draft, signupCloses })
				}
			/>
		</Grid>
	</Stack>
);
