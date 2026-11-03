import type { AppData, Member } from "../domain/app-types";

export const withMemberMergeFixtures = (data: AppData): AppData => {
	if (process.env.EXPO_PUBLIC_REVIEW_MODE !== "true") return data;
	const target = data.members.find((member) => member.id === "sam");
	const event = data.events.find((entry) => entry.id === "club-thu");
	if (
		!target ||
		!event ||
		data.members.some((member) => member.id === "archived-sam")
	)
		return data;
	const source: Member = {
		...target,
		id: "archived-sam",
		name: "Sam Rivera (archived)",
		archived: true,
		archivedAt: "2026-08-31",
		goal: "Stay close to the passing lane",
		steps: 1,
	};
	const conflicting: Member = {
		...source,
		id: "archived-duplicate",
		name: "Sam Rivera (duplicate)",
	};
	return {
		...data,
		members: [...data.members, source, conflicting],
		events: [
			...data.events,
			{
				...event,
				id: "merge-history",
				title: "Previous season practice",
				date: "2026-08-15",
				endDate: undefined,
				seriesId: undefined,
			},
		],
		responses: [
			...data.responses,
			{
				eventId: "merge-history",
				personId: source.id,
				response: "going",
				attendance: "present",
			},
			{
				eventId: event.id,
				personId: conflicting.id,
				response: "going",
				attendance: "present",
			},
		],
	};
};
