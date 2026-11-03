import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	LoadingContent,
	Progress,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { lineupIncludesPerson } from "../domain/lineup";
import {
	coachScoreAverage,
	defaultPlayerCoaching,
} from "../domain/player-coaching";
import type { PlayerRanking } from "../domain/player-rankings";
import type { SaveCoachScore } from "./player-ranking-row";
import { PlayerRatingFlow } from "./player-rating-flow";

const RankingList = ({
	players,
	save,
}: {
	players: PlayerRanking[];
	save: SaveCoachScore;
}): ReactElement => {
	const [rating, setRating] = useState(false);
	const params = useLocalSearchParams<{ player?: string }>();
	const rated = players.filter((player) =>
		player.scores.some((score) => score.coachId === player.ownCoachId),
	).length;
	const remaining = players.length - rated;

	return (
		<Stack>
			<Surface>
				<Stack gap="sm">
					<Text variant="small" tone="secondary">
						Your ratings
					</Text>
					<Row justify="between" align="end">
						<Row gap="xs">
							<Text variant="number">
								{rated}/{players.length}
							</Text>
							<Text variant="caption" tone="secondary">
								players rated
							</Text>
						</Row>
						<Badge
							label={remaining ? `${remaining} left` : "Up to date"}
							kind={remaining ? "neutral" : "success"}
						/>
					</Row>
					<Progress
						label="Your player ratings"
						value={rated}
						max={players.length}
					/>
					<Button
						label="Rate players"
						prefix="star"
						roleTone="coach"
						isDisabled={!players.length}
						onPress={(): void => setRating(true)}
					/>
					<Text variant="caption" tone="secondary" lines={1}>
						Scores from 0–100 help balance teams.
					</Text>
				</Stack>
			</Surface>

			{rating ? (
				<PlayerRatingFlow
					key={players.at(0)?.ownCoachId}
					players={players}
					initialPersonId={params.player}
					save={save}
					onClose={(): void => setRating(false)}
				/>
			) : undefined}
		</Stack>
	);
};
const LiveRankings = (): ReactElement => {
	const players = useQuery(api.player_coaching.rankings, {});
	const update = useMutation(api.player_coaching.score);
	return players ? (
		<RankingList
			players={players}
			save={async (personId, score, expectedRevision): Promise<void> => {
				await update({ personId, score, expectedRevision });
			}}
		/>
	) : (
		<LoadingContent />
	);
};
const PreviewRankings = (): ReactElement => {
	const { accounts, account } = useApp();
	const [data, setData] = useAtom(previewDataAtom);
	const coaches = accounts.filter((entry) => entry.coachPrograms.length > 0);
	const players = data.members
		.filter(
			(member) =>
				!member.archived && !member.mergedInto && member.programs.length > 0,
		)
		.map((member) => ({
			personId: member.id,
			name: member.name,
			scores: (
				data.playerCoaching?.find((entry) => entry.personId === member.id)
					?.scores ?? []
			).filter((score) => coaches.some((coach) => coach.id === score.coachId)),
			coachCount: coaches.length,
			ownCoachId: account.id,
		}));
	return (
		<RankingList
			players={players}
			save={async (personId, score, expectedRevision): Promise<void> => {
				setData((current) => {
					const member = current.members.find((entry) => entry.id === personId);
					if (!member) throw new Error("Player not found.");
					const profile =
						current.playerCoaching?.find(
							(entry) => entry.personId === personId,
						) ?? defaultPlayerCoaching(member);
					if (
						(profile.scores?.find((entry) => entry.coachId === account.id)
							?.revision ?? 0) !== expectedRevision
					)
						throw new Error(
							"Your score changed elsewhere. Reload it before saving.",
						);
					const scores = [
						...(profile.scores ?? []).filter(
							(entry) => entry.coachId !== account.id,
						),
						{ coachId: account.id, score, revision: expectedRevision + 1 },
					];
					return {
						...current,
						playerCoaching: [
							...(current.playerCoaching ?? []).filter(
								(entry) => entry.personId !== personId,
							),
							{
								...profile,
								scores,
								rating: coachScoreAverage(scores) ?? 0,
								ratingKnown: true,
								revision: profile.revision + 1,
							},
						],
						teams: current.teams.map((plan) =>
							lineupIncludesPerson(plan, personId)
								? { ...plan, published: false, coachingStale: true }
								: plan,
						),
					};
				});
			}}
		/>
	);
};
export const PlayerRankings = (): ReactElement =>
	useApp().source === "convex" ? <LiveRankings /> : <PreviewRankings />;
