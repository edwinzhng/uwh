import type { Account } from "./app-types";

export type ClubTool =
	| "programs"
	| "members"
	| "announcements"
	| "fitness"
	| "videos"
	| "documents"
	| "hours"
	| "attendance"
	| "registration"
	| "payments"
	| "equipment"
	| "settings"
	| "moderation"
	| "imports";

export type ClubToolGroup = { title: string; tools: ClubTool[] };

export const clubToolGroups = (account: Account): ClubToolGroup[] => {
	const coach = account.coachPrograms.length > 0;
	const groups: ClubToolGroup[] = [
		{
			title: "Club",
			tools: [
				"programs",
				"members",
				"fitness",
				"videos",
				"documents",
				"announcements",
			],
		},
		{
			title: "Coaching",
			tools: [
				...(coach || account.admin ? (["hours"] as const) : []),
				...(coach ? (["attendance"] as const) : []),
			],
		},
		{
			title: "Administration",
			tools: account.admin
				? [
						"equipment",
						"registration",
						"payments",
						"settings",
						"moderation",
						"imports",
					]
				: [],
		},
	];
	return groups.filter((group) => group.tools.length > 0);
};
