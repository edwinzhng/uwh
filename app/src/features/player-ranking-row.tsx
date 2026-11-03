import { type ReactElement, useState } from "react";
import {
	Avatar,
	Button,
	Field,
	Grid,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { coachScoreAverage, validCoachScore } from "../domain/player-coaching";
import type { PlayerRanking } from "../domain/player-rankings";
import { useFormTask } from "./use-form-task";

export type SaveCoachScore = (
	personId: string,
	score: number,
	expectedRevision: number,
) => Promise<void>;
export const PlayerRankingRow = ({
	player,
	save,
}: {
	player: PlayerRanking;
	save: SaveCoachScore;
}): ReactElement => {
	const own = player.scores.find(
		(entry) => entry.coachId === player.ownCoachId,
	);
	const [draft, setDraft] = useState({
		value: own ? String(own.score) : "",
		revision: own?.revision ?? 0,
	});
	const task = useFormTask();
	const average = coachScoreAverage(player.scores);
	const changedElsewhere =
		(own?.revision ?? 0) > draft.revision && Number(draft.value) !== own?.score;
	const unchanged =
		own !== undefined &&
		Number(draft.value) === own.score &&
		draft.value.trim().length > 0;
	const submit = async (): Promise<void> => {
		await task.submit(
			() =>
				changedElsewhere
					? "Your score changed elsewhere. Reload it before saving."
					: validCoachScore(draft.value)
						? undefined
						: "Use a score from 0–100",
			async (): Promise<void> => {
				await save(player.personId, Number(draft.value), draft.revision);
				setDraft((current) => ({ ...current, revision: current.revision + 1 }));
			},
		);
	};
	return (
		<Surface>
			<Stack gap="sm">
				<Grid gap="sm">
					<Row>
						<Avatar name={player.name} personId={player.personId} />
						<Stack grow gap="xxs">
							<Text variant="label">{player.name}</Text>
							<Text variant="caption" tone="secondary">
								{player.scores.length}/{player.coachCount} coaches scored
								{average === undefined ? "" : ` · Average ${average}`}
							</Text>
						</Stack>
					</Row>
					<Row align="end">
						<Stack grow>
							<Field
								label={`Your score for ${player.name}`}
								hideLabel
								placeholder="Your score · 0–100"
								inputMode="decimal"
								value={draft.value}
								onValueChange={(value): void =>
									setDraft((current) => ({ ...current, value }))
								}
								isDisabled={task.busy}
								onSubmit={(): void => {
									void submit();
								}}
							/>
						</Stack>
						<Button
							label={unchanged ? "Saved" : "Save score"}
							variant={unchanged ? "secondary" : "solid"}
							isDisabled={unchanged}
							isLoading={task.busy}
							onPress={(): void => {
								void submit();
							}}
						/>
					</Row>
				</Grid>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				{changedElsewhere ? (
					<Button
						label="Reload my score"
						variant="ghost"
						onPress={(): void => {
							setDraft({
								value: own ? String(own.score) : "",
								revision: own?.revision ?? 0,
							});
							task.clear();
						}}
					/>
				) : undefined}
			</Stack>
		</Surface>
	);
};
