import type { ReactElement } from "react";
import { Field, Grid, Select, Stack, TimeSelector } from "../design-system";
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
		{draft.kind !== "tournament" ? (
			<Field
				label="Capacity (optional)"
				placeholder="No limit"
				inputMode="numeric"
				value={draft.capacity === undefined ? "" : String(draft.capacity)}
				onValueChange={(value): void =>
					onChange({
						...draft,
						capacity: value.trim() ? Number(value) : undefined,
					})
				}
			/>
		) : undefined}
		<EventEligibility
			value={draft.eligiblePersonIds}
			onChange={(eligiblePersonIds): void =>
				onChange({ ...draft, eligiblePersonIds })
			}
		/>
		<Field
			label={
				draft.kind === "tournament"
					? "Details, fees, travel and accommodation"
					: "Details (optional)"
			}
			value={draft.description}
			onValueChange={(description): void => onChange({ ...draft, description })}
			multiline
		/>
		{draft.kind !== "tournament" ? (
			<Grid gap="md">
				<Select
					label="Registration opens"
					value={
						draft.registrationOpen ? "weekday" : (draft.signupOpens ?? "now")
					}
					options={[
						{ value: "now", label: "Immediately" },
						{ value: "weekday", label: "Day and time before event" },
						{ value: "three-days", label: "3 days before" },
						{ value: "week", label: "1 week before" },
					]}
					onValueChange={(signupOpens): void =>
						signupOpens === "weekday"
							? onChange({
									...draft,
									registrationOpen: {
										weeksBefore: 1,
										weekday: 1,
										time: "12:00",
									},
								})
							: onChange({ ...draft, signupOpens, registrationOpen: undefined })
					}
				/>
				<Field
					label="Registration closes (hours before start)"
					inputMode="decimal"
					value={String(
						draft.registrationCloseHours ??
							(draft.signupCloses === "day"
								? 24
								: draft.signupCloses === "hour"
									? 1
									: 0),
					)}
					onValueChange={(value): void =>
						onChange({ ...draft, registrationCloseHours: Number(value) })
					}
				/>
			</Grid>
		) : undefined}
		{draft.registrationOpen ? (
			<Grid gap="sm">
				<Field
					label="Weeks before event"
					inputMode="numeric"
					value={String(draft.registrationOpen.weeksBefore)}
					onValueChange={(value): void =>
						onChange({
							...draft,
							registrationOpen: {
								...(draft.registrationOpen ?? {
									weeksBefore: 1,
									weekday: 1,
									time: "12:00",
								}),
								weeksBefore: Number(value),
							},
						})
					}
				/>
				<Select
					label="Day of week"
					value={String(draft.registrationOpen.weekday)}
					options={[
						"Monday",
						"Tuesday",
						"Wednesday",
						"Thursday",
						"Friday",
						"Saturday",
						"Sunday",
					].map((label, index) => ({ label, value: String(index + 1) }))}
					onValueChange={(value): void =>
						onChange({
							...draft,
							registrationOpen: {
								...(draft.registrationOpen ?? {
									weeksBefore: 1,
									weekday: 1,
									time: "12:00",
								}),
								weekday: Number(value),
							},
						})
					}
				/>
				<TimeSelector
					label="Opening time"
					value={draft.registrationOpen.time}
					onValueChange={(time): void =>
						onChange({
							...draft,
							registrationOpen: {
								...(draft.registrationOpen ?? {
									weeksBefore: 1,
									weekday: 1,
									time: "12:00",
								}),
								time: time ?? "",
							},
						})
					}
				/>
			</Grid>
		) : undefined}
	</Stack>
);
