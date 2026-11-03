import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import type { DevelopmentService } from "../backend/use-development";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	List,
	ListItem,
	LoadingContent,
	Progress,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { playerRatingLabel } from "../domain/player-coaching";
import { DevelopmentReviewForm } from "./development-review-form";
import { useFormTask } from "./use-form-task";

export const DevelopmentPanel = ({
	player,
	loading,
	save,
	finalize,
	reopen,
}: DevelopmentService): ReactElement => {
	const router = useRouter();
	const [confirm, setConfirm] = useState<"finalize" | "reopen">();
	const task = useFormTask();
	if (!player)
		return loading ? (
			<LoadingContent />
		) : (
			<Stack>
				<Button
					label="All players"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.setParams({ person: undefined })}
				/>
				<EmptyState
					title="Player unavailable"
					description="Return to the player list to choose a current club player."
				/>
			</Stack>
		);
	const round = player.round;
	const finalized = round?.status === "finalized";
	const canReopen =
		!player.member.archived &&
		(finalized ||
			round?.status === "superseded" ||
			player.rosterChanged ||
			player.profileChanged);
	return (
		<Stack>
			<Row justify="between" wrap>
				<Button
					label="All players"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.setParams({ person: undefined })}
				/>
				<Button
					label="Player profile"
					variant="ghost"
					onPress={(): void =>
						router.push({
							pathname: "/member",
							params: { id: player.member.id, tab: "coach" },
						})
					}
				/>
			</Row>
			<Surface
				header={
					<Row justify="between" wrap>
						<Text variant="h4">{player.member.name}</Text>
						<Badge
							label={`Round ${round?.round ?? 1}${finalized ? " · Finalized" : round?.status === "superseded" ? " · Preserved history" : ""}`}
							kind={finalized ? "success" : "neutral"}
						/>
					</Row>
				}
			>
				<Stack>
					{player.member.archived ? (
						<Text variant="small" tone="secondary">
							Archived player · review history is read-only.
						</Text>
					) : undefined}
					<Row justify="between" wrap>
						<Text>Current rating · {playerRatingLabel(player.profile)}</Text>
						<Text>
							{player.submittedCount}/{player.requiredCount} coaches submitted
						</Text>
					</Row>
					{player.average !== undefined ? (
						<Text>Submitted average · {player.average}</Text>
					) : undefined}
					{player.rosterChanged || player.profileChanged ? (
						<Text variant="small" tone="warning">
							{player.rosterChanged
								? "The coach roster changed."
								: "Player details changed."}{" "}
							Start a new round to review the current player details with the
							current coaches.
						</Text>
					) : undefined}
					<Row wrap>
						{!round || round.status === "open" ? (
							<Button
								label="Finalize rating"
								variant="secondary"
								isDisabled={!player.canFinalize || task.busy}
								onPress={(): void => setConfirm("finalize")}
							/>
						) : undefined}
						{round && canReopen ? (
							<Button
								label={finalized ? "Reopen reviews" : "Start new round"}
								variant="secondary"
								isDisabled={task.busy}
								onPress={(): void => setConfirm("reopen")}
							/>
						) : undefined}
					</Row>
				</Stack>
			</Surface>
			{!player.member.archived &&
			(!round || round.status === "open") &&
			player.canReview !== false &&
			!player.rosterChanged &&
			!player.profileChanged ? (
				<DevelopmentReviewForm
					key={`${player.member.id}:${round?.round ?? 1}`}
					player={player}
					save={save}
				/>
			) : undefined}
			{player.canReview === false ? (
				<Text variant="small" tone="secondary">
					You are not a required reviewer for this round.
				</Text>
			) : undefined}
			{player.observations.length > 0 ? (
				<Surface header={<Text variant="h4">Submitted observations</Text>}>
					<List>
						{player.observations.map((entry) => (
							<ListItem
								key={entry.coachId}
								title={entry.coachName}
								description={entry.observation}
							/>
						))}
					</List>
				</Surface>
			) : undefined}
			<Surface header={<Text variant="h4">Current goal</Text>}>
				{player.member.goal ? (
					<Stack gap="sm">
						<Text>{player.member.goal}</Text>
						<Text variant="small" tone="secondary">
							{player.member.steps}/6 check-ins
						</Text>
						<Progress
							label={`${player.member.name} goal check-ins`}
							value={player.member.steps}
							max={6}
						/>
					</Stack>
				) : (
					<EmptyState
						title="No goal set"
						description="Open the player profile to agree a training goal."
					/>
				)}
			</Surface>
			<Dialog
				intent="confirmation"
				isDismissDisabled={task.busy}
				title={
					confirm === "finalize"
						? `Set rating to ${player.average ?? "—"}?`
						: "Start a new review round?"
				}
				isOpen={confirm !== undefined}
				onOpenChange={(open): void => {
					if (!open && !task.busy) {
						setConfirm(undefined);
						task.clear();
					}
				}}
				footer={
					<Button
						label={
							confirm === "finalize" ? "Finalize rating" : "Start new round"
						}
						isLoading={task.busy}
						onPress={(): void => {
							if (!round || !confirm) return;
							void task.run(async (): Promise<void> => {
								await (confirm === "finalize" ? finalize : reopen)({
									personId: player.member.id,
									round: round.round,
									revision: round.revision,
								});
								setConfirm(undefined);
							});
						}}
					/>
				}
			>
				<Stack>
					<Text>
						{confirm === "finalize"
							? "This becomes the player’s team-balancing rating. Existing teams containing the player will need coach review and republication."
							: "The current rating stays in use while coaches submit fresh reviews. Previous round submissions are retained privately."}
					</Text>
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</Stack>
	);
};
