import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Field,
	Grid,
	Select,
	Stack,
	Surface,
	Text,
	TimeSelector,
} from "../design-system";
import type { EventDraft } from "../domain/app-types";
import { defaultClubTimeZone, timeZoneOptions } from "../domain/time-zones";

export const TournamentOptions = ({
	draft,
	onChange,
}: {
	draft: EventDraft;
	onChange: (draft: EventDraft) => void;
}): ReactElement => {
	const { data } = useApp();
	const roster = draft.tournamentRoster ?? [];
	return (
		<Stack>
			<Surface header={<Text variant="h4">Tournament dates</Text>}>
				<Stack>
					<Select
						label="Tournament timezone"
						value={draft.timeZone ?? data.timeZone ?? defaultClubTimeZone}
						options={timeZoneOptions}
						onValueChange={(timeZone): void => onChange({ ...draft, timeZone })}
					/>
					<Text variant="caption" tone="secondary">
						Dates, times and the response deadline use this timezone.
					</Text>
					<DatePicker
						label="Last day"
						value={draft.endDate ?? draft.date}
						onValueChange={(endDate): void => onChange({ ...draft, endDate })}
					/>
					<Grid gap="md">
						<TimeSelector
							label="Starts on first day"
							value={draft.start}
							onValueChange={(start): void =>
								onChange({ ...draft, start: start ?? "" })
							}
						/>
						<TimeSelector
							label="Ends on last day"
							value={draft.end}
							onValueChange={(end): void =>
								onChange({ ...draft, end: end ?? "" })
							}
						/>
					</Grid>
					<DatePicker
						label="Respond by (optional)"
						value={draft.responseDeadline}
						onValueChange={(responseDeadline): void =>
							onChange({ ...draft, responseDeadline })
						}
					/>
					<Text variant="caption" tone="secondary">
						Responses close at the end of this day, or when the tournament
						starts if earlier.
					</Text>
				</Stack>
			</Surface>
			<Surface header={<Text variant="h4">Confirmed roster</Text>}>
				<Stack>
					<Text variant="small" tone="secondary">
						Interest does not confirm a place. Add selected players here with
						their team name. These assignments are visible to club members.
					</Text>
					{roster.map((entry) => (
						<Stack key={entry.personId} gap="xs">
							<Text variant="label">
								{data.members.find((member) => member.id === entry.personId)
									?.name ?? "Player"}
							</Text>
							<Field
								label="Team"
								value={entry.team}
								onValueChange={(team): void =>
									onChange({
										...draft,
										tournamentRoster: roster.map((player) =>
											player.personId === entry.personId
												? { ...player, team }
												: player,
										),
									})
								}
							/>
							<Button
								label="Remove from roster"
								variant="ghost"
								onPress={(): void =>
									onChange({
										...draft,
										tournamentRoster: roster.filter(
											(player) => player.personId !== entry.personId,
										),
									})
								}
							/>
						</Stack>
					))}
					<Select
						label="Add player"
						value={undefined}
						options={data.members
							.filter(
								(member) =>
									member.programs.length > 0 &&
									!roster.some((entry) => entry.personId === member.id),
							)
							.map((member) => ({ value: member.id, label: member.name }))}
						onValueChange={(personId): void => {
							if (personId)
								onChange({
									...draft,
									tournamentRoster: [
										...roster,
										{ personId, team: "Club team" },
									],
								});
						}}
					/>
				</Stack>
			</Surface>
		</Stack>
	);
};
