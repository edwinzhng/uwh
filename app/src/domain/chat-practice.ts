import type { ClubEvent } from "./app-types";
import { clubTimestamp } from "./event-time";
import { managedRoom, programRoomId } from "./managed-rooms";
import { eventFinished } from "./schedule-agenda";

export type ChatPractice = { event: ClubEvent; attending: number };
export const chatProgramId = (threadId: string): string | undefined => {
	const room = managedRoom(threadId);
	return room?.kind === "program" && programRoomId(room.programId) === threadId
		? room.programId
		: undefined;
};
export const isUpcomingPractice = (event: ClubEvent, now: number): boolean =>
	!event.cancelled &&
	(event.kind === "training" || event.kind === "hockey") &&
	!eventFinished(event, now);
export const nextChatPractice = (
	events: readonly ClubEvent[],
	threadId: string,
	now: number,
): ClubEvent | undefined => {
	const programId = chatProgramId(threadId);
	return programId
		? events
				.filter(
					(event) =>
						event.program === programId && isUpcomingPractice(event, now),
				)
				.sort(
					(a, b) =>
						clubTimestamp(a.date, a.start, a.timeZone) -
							clubTimestamp(b.date, b.start, b.timeZone) ||
						a.id.localeCompare(b.id),
				)
				.at(0)
		: undefined;
};
