import { type ReactElement, useState } from "react";
import type { DevelopmentService } from "../backend/use-development";
import {
	Badge,
	Button,
	Field,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	type DevelopmentPlayer,
	validateDevelopmentDraft,
} from "../domain/development";
import { useFormTask } from "./use-form-task";

export const DevelopmentReviewForm = ({
	player,
	save,
}: {
	player: DevelopmentPlayer;
	save: DevelopmentService["save"];
}): ReactElement => {
	const [rating, setRating] = useState(
		player.ownReview?.rating?.toString() ?? "",
	);
	const [observation, setObservation] = useState(
		player.ownReview?.observation ?? "",
	);
	const [revision, setRevision] = useState(player.ownReview?.revision ?? 0);
	const task = useFormTask();
	const stale = (player.ownReview?.revision ?? 0) !== revision;
	const submit = (publish: boolean): void => {
		const draft = {
			personId: player.member.id,
			round: player.round?.round ?? 1,
			revision,
			rating: rating.trim() ? Number(rating) : undefined,
			observation,
			submit: publish,
		};
		void task.submit(
			() => validateDevelopmentDraft(draft),
			async (): Promise<void> => {
				await save(draft);
				setRevision(revision + 1);
			},
		);
	};
	return (
		<Surface
			header={
				<Row justify="between">
					<Text variant="h4">Your review</Text>
					<Badge
						label={
							player.ownReview?.status === "submitted"
								? "Submitted"
								: "Private draft"
						}
						kind={
							player.ownReview?.status === "submitted" ? "success" : "neutral"
						}
					/>
				</Row>
			}
		>
			<Stack>
				<Field
					label="Skill rating · 1–100"
					value={rating}
					onValueChange={setRating}
					inputMode="decimal"
					isDisabled={task.busy}
				/>
				<Field
					label="Observation · optional"
					value={observation}
					onValueChange={setObservation}
					multiline
					maxLength={1000}
					isDisabled={task.busy}
				/>
				<Text variant="small" tone="secondary">
					Drafts are visible only to you. Submitted ratings contribute to the
					coach average.
				</Text>
				{player.ownReview?.status === "submitted" ? (
					<Text variant="small" tone="secondary">
						Saving a draft withdraws your submission until you submit again.
					</Text>
				) : undefined}
				{stale ? (
					<Button
						label="Reload saved review"
						variant="secondary"
						isDisabled={task.busy}
						onPress={(): void => {
							setRating(player.ownReview?.rating?.toString() ?? "");
							setObservation(player.ownReview?.observation ?? "");
							setRevision(player.ownReview?.revision ?? 0);
							task.clear();
						}}
					/>
				) : undefined}
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<Row justify="end" wrap>
					<Button
						label="Save draft"
						variant="secondary"
						isDisabled={task.busy || stale}
						onPress={(): void => submit(false)}
					/>
					<Button
						label="Submit review"
						isLoading={task.busy}
						isDisabled={stale}
						onPress={(): void => submit(true)}
					/>
				</Row>
			</Stack>
		</Surface>
	);
};
