import type { ReactElement } from "react";
import { Grid, Stack, Text, TimeSelector, Toggle } from "../design-system";
import type { EventDraft } from "../domain/app-types";
import {
	toggleEventParts,
	updateEventPartTime,
} from "../domain/event-part-draft";

export const EventPartsEditor = ({
	draft,
	onChange,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
}): ReactElement => (
	<Stack>
		{draft.kind !== "social" ? (
			<Toggle
				label="Training + hockey"
				value={Boolean(draft.parts?.length)}
				onValueChange={(enabled): void =>
					onChange(toggleEventParts(draft, enabled))
				}
			/>
		) : undefined}
		{draft.parts?.length ? (
			draft.parts.map((part) => (
				<Stack key={part.id} gap="sm">
					<Text variant="small">{part.title}</Text>
					<Grid gap="md">
						<TimeSelector
							label={`${part.title} starts`}
							value={part.start}
							onValueChange={(value): void =>
								onChange(
									updateEventPartTime(draft, part.id, "start", value ?? ""),
								)
							}
						/>
						<TimeSelector
							label={`${part.title} ends`}
							value={part.end}
							onValueChange={(value): void =>
								onChange(
									updateEventPartTime(draft, part.id, "end", value ?? ""),
								)
							}
						/>
					</Grid>
				</Stack>
			))
		) : (
			<Grid gap="md">
				<TimeSelector
					label="Starts"
					value={draft.start}
					onValueChange={(start): void =>
						onChange({ ...draft, start: start ?? "" })
					}
				/>
				<TimeSelector
					label="Ends"
					value={draft.end}
					onValueChange={(end): void => onChange({ ...draft, end: end ?? "" })}
				/>
			</Grid>
		)}
	</Stack>
);
