import type { AppData } from "../domain/app-types";

export const reviewScenarioData = (
	data: AppData,
	scenario?: string,
): AppData => {
	if (scenario === "home-cards")
		return {
			...data,
			feedback: [
				...data.feedback,
				{
					id: "review-home-shoutout",
					kind: "shoutout",
					category: "mvp",
					personId: "alex",
					authorId: "casey",
					body: "You made the team better. Thanks for always finding the next pass.",
					visibility: "published",
					date: data.notices.at(0)?.date ?? "2026-11-04",
				},
			],
		};
	if (scenario === "quiet")
		return {
			...data,
			events: [],
			responses: [],
			teams: [],
			feedback: [],
			notices: [],
			messages: [],
			charges: [],
			payments: [],
			equipment: [],
			loans: [],
		};
	if (scenario === "long")
		return {
			...data,
			events: data.events.map((event) => ({
				...event,
				title:
					"Thursday evening underwater hockey training and club development session",
				venue: "MNP Community & Sport Centre — Competition Pool",
			})),
			members: data.members.map((member) => ({
				...member,
				name: `${member.name} Montgomery-Wellington`,
			})),
			conversations: data.conversations.map((room) => ({
				...room,
				title:
					"Club training, tournament preparation and community announcements",
			})),
		};
	return data;
};
