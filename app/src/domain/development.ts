import type { Member } from "./app-types";
import type { PlayerCoaching } from "./player-coaching";

export class DevelopmentError extends Error {}

export type DevelopmentCoach = { id: string; name: string };
export type DevelopmentRound = {
	originPersonId?: string;
	originRound?: number;
	personId: string;
	round: number;
	revision: number;
	status: "open" | "finalized" | "superseded";
	requiredCoachIds: string[];
	profileRevision: number;
	updatedAt: number;
	finalizedRating?: number;
	finalizedAt?: number;
};
export type DevelopmentReview = {
	originPersonId?: string;
	originRound?: number;
	personId: string;
	round: number;
	coachId: string;
	revision: number;
	status: "draft" | "submitted";
	rating?: number;
	observation: string;
	updatedAt: number;
};
export type DevelopmentDraft = {
	personId: string;
	round: number;
	revision: number;
	rating?: number;
	observation: string;
	submit: boolean;
};
export type DevelopmentVersion = {
	personId: string;
	round: number;
	revision: number;
};
export type DevelopmentPlayer = {
	canReview?: boolean;
	member: Member;
	profile: PlayerCoaching;
	round?: DevelopmentRound;
	ownReview?: DevelopmentReview;
	submittedCount: number;
	requiredCount: number;
	average?: number;
	observations: { coachId: string; coachName: string; observation: string }[];
	rosterChanged: boolean;
	profileChanged: boolean;
	canFinalize: boolean;
};

export const requireDevelopmentCoach = (account: {
	coachPrograms: readonly string[];
}): void => {
	if (account.coachPrograms.length === 0)
		throw new DevelopmentError("Coach access required.");
};

export const validateDevelopmentDraft = (
	draft: Pick<DevelopmentDraft, "rating" | "observation" | "submit">,
): string | undefined => {
	if (draft.rating === undefined && draft.submit) return "Add a rating";
	if (
		draft.rating !== undefined &&
		(!Number.isFinite(draft.rating) || draft.rating < 1 || draft.rating > 100)
	)
		return "Use a rating from 1–100";
	if (draft.observation.trim().length > 1000)
		return "Keep the observation to 1,000 characters";
	return undefined;
};

export const sameCoachRoster = (
	left: readonly string[],
	right: readonly string[],
): boolean =>
	left.length === right.length && left.every((id) => right.includes(id));

export const nextDevelopmentRound = (
	personId: string,
	previous: DevelopmentRound | undefined,
	profile: PlayerCoaching,
	coachIds: readonly string[],
	now: number,
): DevelopmentRound => ({
	personId,
	round: (previous?.round ?? 0) + 1,
	revision: 0,
	status: "open",
	requiredCoachIds: [...new Set(coachIds)].sort(),
	profileRevision: profile.revision,
	updatedAt: now,
});

export const assertDevelopmentVersion = (
	round: DevelopmentRound,
	expected: DevelopmentVersion,
): void => {
	if (
		round.personId !== expected.personId ||
		round.round !== expected.round ||
		round.revision !== expected.revision
	)
		throw new DevelopmentError(
			"The review round changed. Refresh and try again.",
		);
};

export const nextDevelopmentReview = (
	round: DevelopmentRound,
	current: DevelopmentReview | undefined,
	coachId: string,
	draft: DevelopmentDraft,
	now: number,
): DevelopmentReview => {
	if (round.status !== "open")
		throw new DevelopmentError(
			"This review round is closed. Start a new round to rescore.",
		);
	if (draft.round !== round.round || draft.personId !== round.personId)
		throw new DevelopmentError(
			"The review round changed. Reopen the player to continue.",
		);
	if (!round.requiredCoachIds.includes(coachId))
		throw new DevelopmentError(
			"The coach roster changed. Start a new round to join.",
		);
	if (draft.revision !== (current?.revision ?? 0))
		throw new DevelopmentError(
			"Your review changed in another session. Reopen to continue.",
		);
	const error = validateDevelopmentDraft(draft);
	if (error) throw new DevelopmentError(error);
	return {
		personId: round.personId,
		round: round.round,
		coachId,
		revision: draft.revision + 1,
		status: draft.submit ? "submitted" : "draft",
		rating: draft.rating,
		observation: draft.observation.trim(),
		updatedAt: now,
	};
};

export const developmentPlayer = (
	member: Member,
	profile: PlayerCoaching,
	round: DevelopmentRound | undefined,
	reviews: readonly DevelopmentReview[],
	coaches: readonly DevelopmentCoach[],
	currentCoachId: string,
): DevelopmentPlayer => {
	const currentReviews = reviews.filter(
		(review) => review.personId === member.id && review.round === round?.round,
	);
	const required = round?.requiredCoachIds ?? coaches.map((coach) => coach.id);
	const submitted = [
		...new Map(
			currentReviews
				.filter(
					(review) =>
						review.status === "submitted" &&
						review.rating !== undefined &&
						Number.isFinite(review.rating) &&
						review.rating >= 1 &&
						review.rating <= 100 &&
						required.includes(review.coachId),
				)
				.map((review) => [review.coachId, review]),
		).values(),
	];
	const ratings = submitted.flatMap((review) =>
		review.rating === undefined ? [] : [review.rating],
	);
	const average = ratings.length
		? Math.round(
				(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) *
					10,
			) / 10
		: undefined;
	const rosterChanged = !sameCoachRoster(
		required,
		coaches.map((coach) => coach.id),
	);
	const profileChanged =
		round !== undefined &&
		round.profileRevision !== profile.revision &&
		round.status === "open";
	return {
		member,
		canReview: required.includes(currentCoachId),
		profile,
		round,
		ownReview: currentReviews.find(
			(review) => review.coachId === currentCoachId,
		),
		submittedCount: submitted.length,
		requiredCount: required.length,
		average,
		observations: submitted
			.filter((review) => review.observation)
			.map((review) => ({
				coachId: review.coachId,
				coachName:
					coaches.find((coach) => coach.id === review.coachId)?.name ??
					"Former coach",
				observation: review.observation,
			})),
		rosterChanged,
		profileChanged,
		canFinalize:
			!member.archived &&
			round?.status === "open" &&
			required.length > 0 &&
			submitted.length === required.length &&
			average !== undefined &&
			!rosterChanged &&
			!profileChanged,
	};
};

export const finalizedDevelopmentRating = (
	player: DevelopmentPlayer,
): number => {
	if (player.member.archived)
		throw new DevelopmentError("Restore the player before updating reviews.");
	if (player.round?.status !== "open")
		throw new DevelopmentError("This review round is closed.");
	if (player.rosterChanged)
		throw new DevelopmentError(
			"The coach roster changed. Start a new round before finalizing.",
		);
	if (player.profileChanged)
		throw new DevelopmentError(
			"Player details changed. Start a new round before finalizing.",
		);
	if (!player.canFinalize || player.average === undefined)
		throw new DevelopmentError(
			"Every required coach must submit a review before finalizing.",
		);
	return player.average;
};

export const assertDevelopmentReopen = (player: DevelopmentPlayer): void => {
	if (player.member.archived)
		throw new DevelopmentError("Restore the player before updating reviews.");
	if (!player.round)
		throw new DevelopmentError("Save a review to start the first round.");
	if (
		player.round.status !== "finalized" &&
		player.round.status !== "superseded" &&
		!player.rosterChanged &&
		!player.profileChanged
	)
		throw new DevelopmentError(
			"Complete the current review round before starting another.",
		);
};
