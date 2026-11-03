import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import {
	EmptyState,
	Field,
	InfiniteScroll,
	LoadingContent,
	SectionHeading,
	Stack,
	Text,
} from "../design-system";
import { lineupIncludesPerson } from "../domain/lineup";
import {
	coachScoreAverage,
	defaultPlayerCoaching,
} from "../domain/player-coaching";
import {
	orderRankings,
	type PlayerRanking,
	rankingComplete,
} from "../domain/player-rankings";
import { PlayerRankingRow, type SaveCoachScore } from "./player-ranking-row";

const RankingList = ({
	players,
	save,
}: {
	players: PlayerRanking[];
	save: SaveCoachScore;
}): ReactElement => {
	const params = useLocalSearchParams<{ player?: string }>();
	const [search, setSearch] = useState(
		players.find((player) => player.personId === params.player)?.name ?? "",
	);
	const [limit, setLimit] = useState(20);
	const ordered = orderRankings(players).filter((player) =>
		player.name.toLowerCase().includes(search.toLowerCase().trim()),
	);
	const visible = ordered.slice(0, limit);
	return (
		<Stack>
			<Text variant="small" tone="secondary">
				Each coach adds a score from 0–100. The average is used to balance
				teams. Your unscored players come first.
			</Text>
			<Field
				label="Search players"
				hideLabel
				inputMode="search"
				placeholder="Search players"
				value={search}
				onValueChange={(value): void => {
					setSearch(value);
					setLimit(20);
				}}
			/>
			{visible.map((player, index) => {
				const complete = rankingComplete(player);
				const previous = visible.at(index - 1);
				const startsGroup =
					index === 0 || (previous && rankingComplete(previous) !== complete);
				const count = ordered.filter(
					(entry) => rankingComplete(entry) === complete,
				).length;
				return (
					<Stack key={player.personId} gap="sm">
						{startsGroup ? (
							<SectionHeading key="heading">
								{complete ? "Fully scored" : "Needs scores"} · {count}
							</SectionHeading>
						) : undefined}
						<PlayerRankingRow key="score" player={player} save={save} />
					</Stack>
				);
			})}
			{!ordered.length ? (
				<EmptyState
					title="No players found"
					description="Try another name or clear your search."
				/>
			) : undefined}
			<InfiniteScroll
				loadMore={
					visible.length < ordered.length
						? (): void => setLimit((current) => current + 20)
						: undefined
				}
			/>
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
