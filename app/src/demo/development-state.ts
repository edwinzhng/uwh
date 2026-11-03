import { atom } from "jotai";
import {
	assertDevelopmentReopen,
	assertDevelopmentVersion,
	type DevelopmentDraft,
	type DevelopmentReview,
	type DevelopmentRound,
	type DevelopmentVersion,
	developmentPlayer,
	finalizedDevelopmentRating,
	nextDevelopmentReview,
	nextDevelopmentRound,
	requireDevelopmentCoach,
} from "../domain/development";
import {
	defaultDevelopmentPolicy,
	developmentReviewers,
} from "../domain/development-policy";
import { lineupIncludesPerson } from "../domain/lineup";
import { defaultPlayerCoaching } from "../domain/player-coaching";
import { previewAccounts } from "./app-data";
import { previewAccountAtom, previewDataAtom } from "./app-state";
import { previewCoachingSchedule } from "./coaching-schedule-state";

export type DevelopmentPreviewState = {
	rounds: DevelopmentRound[];
	reviews: DevelopmentReview[];
};
type PreviewCommand =
	| { type: "save"; draft: DevelopmentDraft }
	| { type: "finalize" | "reopen"; version: DevelopmentVersion };

export const previewDevelopmentAtom = atom<DevelopmentPreviewState>({
	rounds: [],
	reviews: [],
});

export const previewDevelopmentCoaches = previewAccounts
	.filter((account) => account.coachPrograms.length > 0)
	.map((account) => ({ id: account.id, name: account.name }));
export const previewDevelopmentPolicy = atom(defaultDevelopmentPolicy());
export const previewDevelopmentReviewers = atom((get) => {
	const schedule = get(previewCoachingSchedule);
	return developmentReviewers(
		previewDevelopmentCoaches,
		get(previewDevelopmentPolicy),
		schedule.backupCoachIds,
		schedule.days.flatMap((day) => day.coachIds),
	);
});

export const previewDevelopmentCommandAtom = atom(
	undefined,
	(get, set, command: PreviewCommand): void => {
		const account = get(previewAccountAtom);
		const coaches = get(previewDevelopmentReviewers);
		requireDevelopmentCoach(account);
		const data = get(previewDataAtom);
		const input = command.type === "save" ? command.draft : command.version;
		const member = data.members.find(
			(entry) => entry.id === input.personId && entry.programs.length > 0,
		);
		if (!member) throw new Error("Player not found.");
		if (member.archived)
			throw new Error("Restore the player before updating reviews.");
		const profile =
			data.playerCoaching?.find((entry) => entry.personId === member.id) ??
			defaultPlayerCoaching(member);
		const state = get(previewDevelopmentAtom);
		const previousRound = state.rounds
			.filter((round) => round.personId === member.id)
			.slice()
			.sort((a, b) => b.round - a.round)
			.at(0);
		const now = Date.now();
		const round =
			previousRound ??
			nextDevelopmentRound(
				member.id,
				undefined,
				profile,
				coaches.map((coach) => coach.id),
				now,
			);
		const otherRounds = state.rounds.filter(
			(entry) => entry.personId !== member.id || entry.round !== round.round,
		);
		if (command.type === "save") {
			const currentReview = state.reviews.find(
				(review) =>
					review.personId === member.id &&
					review.round === round.round &&
					review.coachId === account.id,
			);
			const review = nextDevelopmentReview(
				round,
				currentReview,
				account.id,
				command.draft,
				now,
			);
			set(previewDevelopmentAtom, {
				rounds: [
					...otherRounds,
					{ ...round, revision: round.revision + 1, updatedAt: now },
				],
				reviews: [
					...state.reviews.filter(
						(entry) =>
							entry.personId !== member.id ||
							entry.round !== round.round ||
							entry.coachId !== account.id,
					),
					review,
				],
			});
			return;
		}
		if (!previousRound) throw new Error("No review round exists yet.");
		assertDevelopmentVersion(round, command.version);
		const player = developmentPlayer(
			member,
			profile,
			round,
			state.reviews,
			coaches,
			account.id,
		);
		if (command.type === "finalize") {
			const rating = finalizedDevelopmentRating(player);
			set(previewDataAtom, {
				...data,
				playerCoaching: [
					...(data.playerCoaching ?? []).filter(
						(entry) => entry.personId !== member.id,
					),
					{
						...profile,
						rating,
						ratingKnown: true,
						revision: profile.revision + 1,
					},
				],
				teams: data.teams.map((team) =>
					lineupIncludesPerson(team, member.id)
						? { ...team, published: false, coachingStale: true }
						: team,
				),
			});
			set(previewDevelopmentAtom, {
				...state,
				rounds: [
					...otherRounds,
					{
						...round,
						status: "finalized",
						finalizedRating: rating,
						finalizedAt: now,
						updatedAt: now,
						revision: round.revision + 1,
					},
				],
			});
			return;
		}
		assertDevelopmentReopen(player);
		set(previewDevelopmentAtom, {
			...state,
			rounds: [
				...otherRounds,
				{
					...round,
					status: round.status === "open" ? "superseded" : round.status,
				},
				nextDevelopmentRound(
					member.id,
					round,
					profile,
					coaches.map((coach) => coach.id),
					now,
				),
			],
		});
	},
);
