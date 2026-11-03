export type SessionCheckIn = {
	eventId: string;
	personId: string;
	energy: number;
	note: string;
	updatedAt: number;
};
export const validateSessionCheckIn = (
	energy: number,
	note: string,
): string | undefined =>
	!Number.isInteger(energy) || energy < 1 || energy > 5
		? "Choose an energy level from 1–5"
		: note.length > 500
			? "Keep the note to 500 characters"
			: undefined;

import { canManagePerson } from "./app-rules";
import type { Account } from "./app-types";

export const canReviewSessionCheckins = (
	account: Account,
	assignedCoachIds: string[],
): boolean =>
	account.coachPrograms.length > 0 && assignedCoachIds.includes(account.id);

export const visibleSessionCheckins = (
	entries: SessionCheckIn[],
	account: Account,
	assignedCoachIds: string[],
): SessionCheckIn[] =>
	entries.filter(
		(entry) =>
			canManagePerson(account, entry.personId) ||
			canReviewSessionCheckins(account, assignedCoachIds),
	);
