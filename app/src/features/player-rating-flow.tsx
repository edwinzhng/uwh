import { type ReactElement, useRef, useState } from "react";
import {
	Avatar,
	Button,
	Dialog,
	EmptyState,
	Field,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { validCoachScore } from "../domain/player-coaching";
import type { PlayerRanking } from "../domain/player-rankings";
import {
	createRatingFlow,
	initialRatingDraft,
	previousRatingPosition,
	type RatingDraft,
	ratingDraftUnchanged,
	ratingFlowPosition,
	savedRatingDraft,
	updateRatingDraft,
} from "../domain/rating-flow";
import type { SaveCoachScore } from "./player-ranking-row";
import { useFormTask } from "./use-form-task";

const PlayerRatingCard = ({
	player,
	save,
	onSaved,
	onBusy,
	draft,
	onDraftChange,
}: {
	player: PlayerRanking;
	save: SaveCoachScore;
	onSaved: (draft: RatingDraft) => void;
	draft: RatingDraft;
	onDraftChange: (draft: RatingDraft) => void;
	onBusy: (busy: boolean) => void;
}): ReactElement => {
	const own = player.scores.find(
		(entry) => entry.coachId === player.ownCoachId,
	);
	const task = useFormTask();
	const advanced = useRef(false);
	const changedElsewhere =
		(own?.revision ?? 0) > draft.revision && Number(draft.value) !== own?.score;
	const unchanged = ratingDraftUnchanged(player, draft);
	const submit = async (): Promise<void> => {
		if (advanced.current) return;
		const success = await task.submit(
			() =>
				changedElsewhere
					? "Your score changed elsewhere. Reload it before saving."
					: validCoachScore(draft.value)
						? undefined
						: "Use a score from 0–100",
			async (): Promise<void> => {
				onBusy(true);
				try {
					if (!unchanged)
						await save(player.personId, Number(draft.value), draft.revision);
				} finally {
					onBusy(false);
				}
			},
		);
		if (success) {
			advanced.current = true;
			onSaved({
				...draft,
				revision: unchanged
					? Math.max(draft.revision, own?.revision ?? 0)
					: draft.revision + 1,
				savedValue: Number(draft.value),
			});
		}
	};
	return (
		<Surface>
			<Stack gap="lg">
				<Row justify="center">
					<Avatar large name={player.name} personId={player.personId} />
				</Row>
				<Text variant="h4" align="center">
					{player.name}
				</Text>
				<Field
					label={`Score for ${player.name}`}
					hint="0–100"
					variant="score"
					value={draft.value}
					inputMode="decimal"
					focusKey={player.personId}
					isDisabled={task.busy}
					error={task.error}
					onValueChange={(value): void => {
						onDraftChange({ ...draft, value });
						task.clear();
					}}
					onSubmit={(): void => {
						void submit();
					}}
				/>
				<Button
					label="Continue"
					isLoading={task.busy}
					onPress={(): void => {
						void submit();
					}}
				/>
				{changedElsewhere ? (
					<Button
						label="Reload my score"
						variant="ghost"
						onPress={(): void => {
							onDraftChange({
								value: own ? String(own.score) : "",
								revision: own?.revision ?? 0,
								savedValue: own?.score,
							});
							task.clear();
						}}
					/>
				) : undefined}
			</Stack>
		</Surface>
	);
};

export const PlayerRatingFlow = ({
	initialPersonId,
	players,
	save,
	onClose,
}: {
	players: PlayerRanking[];
	initialPersonId?: string;
	save: SaveCoachScore;
	onClose: () => void;
}): ReactElement => {
	const [flow, setFlow] = useState(() =>
		createRatingFlow(players, initialPersonId),
	);
	const [busy, setBusy] = useState(false);
	const pending = useRef(false);
	const position = ratingFlowPosition(flow, players);
	const personId = flow.queue.at(position);
	const player = players.find((entry) => entry.personId === personId);
	const previous = previousRatingPosition(flow, players);
	const setPending = (value: boolean): void => {
		pending.current = value;
		setBusy(value);
	};
	const back = (): void => {
		if (!pending.current && previous !== undefined)
			setFlow((current) => ({ ...current, cursor: previous }));
	};

	return (
		<Dialog
			intent="form"
			title="Rate players"
			isOpen
			isDismissDisabled={busy}
			onOpenChange={(open): void => {
				if (!open && !pending.current) onClose();
			}}
			footer={
				<Row justify="between">
					<Button
						label="Back"
						prefix="arrowLeft"
						variant="ghost"
						isDisabled={busy || previous === undefined}
						onPress={back}
					/>
					{!player ? <Button label="Done" onPress={onClose} /> : undefined}
				</Row>
			}
		>
			<Stack>
				<Text variant="caption" tone="secondary">
					{flow.savedIds.length} of {flow.queue.length} saved
				</Text>
				{player ? (
					<PlayerRatingCard
						key={`${player.ownCoachId}:${player.personId}`}
						player={player}
						save={save}
						onBusy={setPending}
						draft={flow.drafts[player.personId] ?? initialRatingDraft(player)}
						onDraftChange={(draft): void =>
							setFlow((current) =>
								updateRatingDraft(current, player.personId, draft),
							)
						}
						onSaved={(draft): void =>
							setFlow((current) =>
								savedRatingDraft(current, player.personId, position, draft),
							)
						}
					/>
				) : (
					<EmptyState title="Ratings complete" />
				)}
			</Stack>
		</Dialog>
	);
};
