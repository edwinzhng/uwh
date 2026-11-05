import { useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { LoadingContent } from "../design-system";
import { lineupIncludesPerson } from "../domain/lineup";
import {
	coachScoreAverage,
	defaultPlayerCoaching,
} from "../domain/player-coaching";
import { withPlayerPositions } from "../domain/position-flow";
import { MatchmakingSections } from "./matchmaking-sections";

const LiveRankings = (): ReactElement => {
	const players = useQuery(api.player_coaching.rankings, {});
	const update = useMutation(api.player_coaching.score);
	const updatePositions = useMutation(api.player_coaching.positions);
	return players ? (
		<MatchmakingSections
			players={players}
			savePositions={async (
				personId,
				positions,
				expectedRevision,
			): Promise<void> => {
				await updatePositions({ personId, positions, expectedRevision });
			}}
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
			positions:
				data.playerCoaching?.find((entry) => entry.personId === member.id)
					?.positions ?? defaultPlayerCoaching(member).positions,
			profileRevision:
				data.playerCoaching?.find((entry) => entry.personId === member.id)
					?.revision ?? 0,
		}));
	return (
		<MatchmakingSections
			players={players}
			savePositions={async (
				personId,
				positions,
				expectedRevision,
			): Promise<void> => {
				setData((current) => {
					const member = current.members.find((entry) => entry.id === personId);
					if (!member || member.archived || member.mergedInto)
						throw new Error("Choose an active player.");
					const profile =
						current.playerCoaching?.find(
							(entry) => entry.personId === personId,
						) ?? defaultPlayerCoaching(member);
					const next = withPlayerPositions(
						profile,
						positions,
						expectedRevision,
					);
					return {
						...current,
						playerCoaching: [
							...(current.playerCoaching ?? []).filter(
								(entry) => entry.personId !== personId,
							),
							{ ...next, revision: next.revision + 1 },
						],
						teams: current.teams.map((plan) =>
							lineupIncludesPerson(plan, personId)
								? { ...plan, published: false, coachingStale: true }
								: plan,
						),
					};
				});
			}}
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
