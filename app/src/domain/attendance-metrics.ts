import type { ClubEvent, Member } from "./app-types";
import { clubTimestamp } from "./event-time";

const attendanceEndTimes = new Map<string, number>();
const attendanceEnd = (event: ClubEvent): number => {
	const key = JSON.stringify([
		event.endDate ?? event.date,
		event.end,
		event.timeZone,
	]);
	const cached = attendanceEndTimes.get(key);
	if (cached !== undefined) return cached;
	const timestamp = clubTimestamp(
		event.endDate ?? event.date,
		event.end,
		event.timeZone,
	);
	if (attendanceEndTimes.size >= 1024) attendanceEndTimes.clear();
	attendanceEndTimes.set(key, timestamp);
	return timestamp;
};

export const attendancePercent = (
	attended: number,
	available: number,
): number | undefined =>
	available ? Math.round((attended / available) * 100) : undefined;
export const availableAttendanceEvent = (
	member: Member,
	event: ClubEvent,
	now: number,
): boolean =>
	!event.cancelled &&
	event.kind !== "social" &&
	event.kind !== "meeting" &&
	!member.mergedInto &&
	(event.eligiblePersonIds
		? event.eligiblePersonIds.includes(member.id)
		: member.programs.length > 0 &&
			(event.program === "all" || member.programs.includes(event.program))) &&
	attendanceEnd(event) <= now;
