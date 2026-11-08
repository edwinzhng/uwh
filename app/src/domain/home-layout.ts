import type { Account } from "./app-types";

export const homeCards = [
	{ id: "practice", label: "My next practice" },
	{ id: "announcement", label: "Announcements" },
	{ id: "shoutouts", label: "Shoutouts" },
	{ id: "season", label: "My season" },
	{ id: "fitness", label: "Fitness tests" },
	{ id: "messages", label: "Recent chats" },
	{ id: "club_stats", label: "Club stats" },
	{ id: "practice_progress", label: "Practices done" },
	{ id: "next_coaching", label: "Next coaching practice" },
	{ id: "coach_tasks", label: "Needs attention" },
	{ id: "coach_tools", label: "Coaching tools" },
] as const;
export type HomeCardId = (typeof homeCards)[number]["id"];
export type HomeLayout = {
	order: HomeCardId[];
	hidden: HomeCardId[];
	revision: number;
};
export type HomeWorkspace = "personal" | "coaching";
export const availableHomeCards = (
	account: Pick<Account, "admin" | "coachPrograms">,
	view: HomeWorkspace,
): HomeCardId[] => {
	const personal: HomeCardId[] = [
		"practice",
		"announcement",
		"shoutouts",
		"season",
		"fitness",
		"messages",
	];
	const coach = account.coachPrograms.length > 0;
	const staff = coach || account.admin;
	return view === "coaching" && coach
		? [
				"club_stats",
				"practice_progress",
				"next_coaching",
				...personal,
				"coach_tasks",
				"coach_tools",
			]
		: [...personal, ...(staff ? ["club_stats" as const] : [])];
};
export const resolveHomeLayout = (
	available: readonly HomeCardId[],
	saved?: HomeLayout | null,
): HomeLayout => ({
	order: [
		...(saved?.order ?? []).filter((id) => available.includes(id)),
		...available.filter((id) => !saved?.order.includes(id)),
	],
	hidden: (saved?.hidden ?? []).filter((id) => available.includes(id)),
	revision: saved?.revision ?? 0,
});
export const homeLayoutError = (
	order: readonly string[],
	hidden: readonly string[],
): string | undefined => {
	const allowed = new Set<string>(homeCards.map((card) => card.id));
	return order.length > homeCards.length ||
		hidden.length > homeCards.length ||
		new Set(order).size !== order.length ||
		new Set(hidden).size !== hidden.length ||
		order.some((id) => !allowed.has(id)) ||
		hidden.some((id) => !order.includes(id))
		? "Review your home cards and try again."
		: undefined;
};

export const homeCardDropTarget = (
	order: readonly HomeCardId[],
	heights: Partial<Record<HomeCardId, number>>,
	dragged: HomeCardId,
	distance: number,
): HomeCardId | undefined => {
	if (Math.abs(distance) < 8) return undefined;
	const centers = new Map<HomeCardId, number>();
	let top = 0;
	for (const id of order) {
		const height = heights[id];
		if (!height) return undefined;
		centers.set(id, top + height / 2);
		top += height;
	}
	const start = centers.get(dragged);
	if (start === undefined) return undefined;
	const destination = start + distance;
	let target = dragged;
	let nearest = Math.abs(distance);
	for (const [id, center] of centers) {
		const delta = Math.abs(destination - center);
		if (delta < nearest) {
			target = id;
			nearest = delta;
		}
	}
	return target === dragged ? undefined : target;
};
