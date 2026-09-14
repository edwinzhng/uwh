import type { ReactElement } from "react";
import { Stack, Surface, Text, Toggle } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { EventDraft } from "../domain/app-types";
import { occurrenceDates } from "../domain/event-recurrence";

const previewDates = (draft: EventDraft): string[] => {
	try {
		return occurrenceDates({ ...draft, excludedDates: undefined });
	} catch {
		return [];
	}
};
export const RecurrencePreview = ({
	draft,
	onChange,
	creating,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
	creating: boolean;
}): ReactElement | undefined => {
	if (draft.repeat === "once" || draft.kind === "tournament") return undefined;
	const dates = previewDates(draft);
	return (
		<Surface header={<Text variant="h4">Session series</Text>}>
			<Stack>
				{creating ? (
					<>
						<Toggle
							label="Committed roster"
							description="Players commit once for the term and report individual absences."
							value={draft.committedRoster ?? false}
							onValueChange={(committedRoster): void =>
								onChange({ ...draft, committedRoster })
							}
						/>
					</>
				) : undefined}
				<Text variant="small">
					Preview dates ·{" "}
					{dates.filter((date) => !draft.excludedDates?.includes(date)).length}{" "}
					sessions
				</Text>
				<Text variant="caption" tone="secondary">
					Exclude holidays or pool closures before saving.
				</Text>
				{dates.map((date) => (
					<Toggle
						key={date}
						compact
						label={formatDate(date)}
						value={!draft.excludedDates?.includes(date)}
						onValueChange={(included): void =>
							onChange({
								...draft,
								excludedDates: included
									? draft.excludedDates?.filter((entry) => entry !== date)
									: [...(draft.excludedDates ?? []), date],
							})
						}
					/>
				))}
			</Stack>
		</Surface>
	);
};
