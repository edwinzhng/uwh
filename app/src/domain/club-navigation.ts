import type { Account } from "./app-types";

export type ClubTool =
	| "programs"
	| "members"
	| "announcements"
	| "fitness"
	| "videos"
	| "documents"
	| "coaching"
	| "reviews"
	| "hours"
	| "attendance"
	| "registration"
	| "payments"
	| "equipment"
	| "settings"
	| "moderation"
	| "imports";

export type ClubCategoryTool = "programs" | "members" | "fitness" | "videos";
export type ClubToolGroup =
	| { kind: "categories"; title: string; tools: ClubCategoryTool[] }
	| { kind: "list"; title: string; tools: ClubTool[] };

export const clubToolGroups = (account: Account): ClubToolGroup[] => {
	const coach = account.coachPrograms.length > 0;
	const groups: ClubToolGroup[] = [
		{
			kind: "categories",
			title: "Browse",
			tools: ["programs", "members", "fitness", "videos"],
		},
		{ kind: "list", title: "Resources", tools: ["documents", "announcements"] },
		{
			kind: "list",
			title: "Coaching",
			tools: [
				...(coach ? (["coaching", "reviews"] as const) : []),
				...(coach || account.admin ? (["hours"] as const) : []),
				...(coach ? (["attendance"] as const) : []),
			],
		},
		{
			kind: "list",
			title: "Manage club",
			tools: [
				...(account.admin
					? ([
							"registration",
							"payments",
							"equipment",
							"settings",
							"moderation",
							"imports",
						] as const)
					: []),
			],
		},
	];
	return groups.filter((group) => group.tools.length > 0);
};
