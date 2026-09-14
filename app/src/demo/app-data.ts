import type { Account, AppData, Member } from "../domain/app-types";

export const previewAccounts: Account[] = [
	{
		id: "alex",
		personId: "alex",
		name: "Alex Rivera",
		children: ["sam", "mila"],
		coachPrograms: ["club", "youth"],
		admin: true,
	},
	{
		id: "taylor",
		personId: "taylor",
		name: "Taylor Brooks",
		children: [],
		coachPrograms: [],
		admin: false,
	},
	{
		id: "jamie",
		personId: "jamie",
		name: "Jamie Rivera",
		children: ["sam", "mila"],
		coachPrograms: [],
		admin: false,
	},
	{
		id: "morgan",
		personId: "morgan",
		name: "Morgan Ellis",
		children: [],
		coachPrograms: [],
		admin: true,
	},
	{
		id: "casey",
		personId: "casey",
		name: "Casey Morgan",
		children: [],
		coachPrograms: ["club"],
		admin: false,
	},
];
export const primaryAccount: Account = {
	id: "alex",
	personId: "alex",
	name: "Alex Rivera",
	children: ["sam", "mila"],
	coachPrograms: ["club", "youth"],
	admin: true,
};
const members: Member[] = [
	{
		id: "alex",
		name: "Alex Rivera",
		programs: ["club"],
		position: "Center",
		rating: 5,
		registration: "approved",
		goal: "Create space after the pass",
		steps: 3,
	},
	{
		id: "sam",
		name: "Sam Rivera",
		programs: ["youth", "club"],
		position: "Forward",
		rating: 3,
		registration: "approved",
		goal: "Find support before the first touch",
		steps: 2,
	},
	{
		id: "mila",
		name: "Mila Rivera",
		programs: ["youth"],
		position: "Wing",
		rating: 2,
		registration: "submitted",
		goal: "Move into the next passing lane",
		steps: 4,
	},
	{
		id: "taylor",
		name: "Taylor Brooks",
		programs: ["club"],
		position: "Wing",
		rating: 3,
		registration: "approved",
		goal: "Recover into defensive shape",
		steps: 1,
	},
	{
		id: "casey",
		name: "Casey Morgan",
		programs: ["club"],
		position: "Full back",
		rating: 5,
		registration: "approved",
		goal: "Build a calmer first touch",
		steps: 5,
	},
	{
		id: "jordan",
		name: "Jordan Lee",
		programs: ["club"],
		position: "Forward",
		rating: 4,
		registration: "submitted",
		goal: "Look up before receiving",
		steps: 2,
	},
	{
		id: "robin",
		name: "Robin Chen",
		programs: ["club"],
		position: "Wing",
		rating: 4,
		registration: "approved",
		goal: "Improve recovery speed",
		steps: 3,
	},
	{
		id: "harper",
		name: "Harper Wilson",
		programs: ["youth"],
		position: "Center",
		rating: 2,
		registration: "missing",
		goal: "Keep the puck close",
		steps: 1,
	},
	{
		id: "quinn",
		name: "Quinn Patel",
		programs: ["youth", "club"],
		position: "Wing",
		rating: 3,
		registration: "approved",
		goal: "Call for the second pass",
		steps: 4,
	},
	{
		id: "jamie",
		name: "Jamie Rivera",
		programs: [],
		position: "Guardian",
		rating: 0,
		registration: "approved",
		goal: "",
		steps: 0,
	},
	{
		id: "morgan",
		name: "Morgan Ellis",
		programs: [],
		position: "Club administrator",
		rating: 0,
		registration: "approved",
		goal: "",
		steps: 0,
	},
];
export const initialAppData: AppData = {
	seasons: [
		{
			id: "2026-2027",
			name: "2026–2027",
			start: "2026-09-01",
			end: "2027-08-31",
		},
	],
	clubName: "Calgary Crocs",
	members,
	events: [
		{
			id: "youth-thu",
			title: "Youth training",
			date: "2026-09-10",
			start: "19:00",
			end: "19:45",
			venue: "MNP Community & Sport Centre",
			program: "youth",
			kind: "training",
			signup: "open",
			capacity: 16,
			description:
				"Passing, puck control and small-sided games. Bring both caps.",
			cancelled: false,
		},
		{
			id: "club-thu",
			title: "Thursday practice",
			date: "2026-09-10",
			start: "19:45",
			end: "21:30",
			venue: "MNP Community & Sport Centre",
			program: "club",
			kind: "training",
			signup: "open",
			capacity: 24,
			description: "Training followed by hockey. Bring both caps.",
			parts: [
				{
					id: "training",
					title: "Training",
					kind: "training",
					start: "19:45",
					end: "20:30",
				},
				{
					id: "hockey",
					title: "Hockey",
					kind: "hockey",
					start: "20:30",
					end: "21:30",
				},
			],
			cancelled: false,
		},
		{
			id: "hockey-fri",
			title: "Friday hockey",
			date: "2026-09-11",
			start: "20:30",
			end: "21:30",
			venue: "MNP Community & Sport Centre",
			program: "club",
			kind: "hockey",
			signup: "open",
			capacity: 24,
			description: "Open play. Bring both caps.",
			cancelled: false,
		},
		{
			id: "sun",
			title: "Sunday skills",
			date: "2026-09-13",
			start: "09:00",
			end: "10:30",
			venue: "MNP Community & Sport Centre",
			program: "club",
			kind: "training",
			signup: "scheduled",
			capacity: 24,
			description: "First touch and support. Signup opens Friday at 6 PM.",
			cancelled: false,
		},
		{
			id: "social",
			title: "Fall welcome",
			date: "2026-09-18",
			start: "18:30",
			end: "20:00",
			venue: "Riverside picnic area",
			program: "club",
			kind: "social",
			signup: "open",
			capacity: 60,
			description:
				"An evening for players and families. Bring something to share.",
			cancelled: false,
		},
		{
			id: "past",
			title: "Club training",
			date: "2026-09-03",
			start: "19:45",
			end: "21:00",
			venue: "MNP Community & Sport Centre",
			program: "club",
			kind: "training",
			signup: "closed",
			capacity: 24,
			description: "First touch under pressure.",
			cancelled: false,
		},
	],
	responses: ["club-thu", "past"]
		.flatMap((eventId) =>
			members
				.filter((member) => member.programs.includes("club"))
				.map((member) => ({
					eventId,
					personId: member.id,
					response:
						member.id === "taylor"
							? ("unanswered" as const)
							: ("going" as const),
					attendance:
						eventId === "past"
							? member.id === "sam"
								? ("late" as const)
								: ("present" as const)
							: ("unmarked" as const),
				})),
		)
		.concat(
			members
				.filter((member) => member.programs.includes("youth"))
				.map((member) => ({
					eventId: "youth-thu",
					personId: member.id,
					response: "going" as const,
					attendance: "unmarked" as const,
				})),
		),
	teams: [],
	plans: {
		"club-thu":
			"10 min · Warm-up and puck control\n20 min · Transition drills\n25 min · Small-sided games\n5 min · Reflection",
		"youth-thu":
			"10 min · Puck control\n15 min · Passing in pairs\n20 min · Small-sided games",
	},
	feedback: [
		{
			id: "f-sam",
			personId: "sam",
			authorId: "casey",
			body: "Your first touch is calmer. Scan for support before receiving, then try finding the second pass.",
			visibility: "published",
			date: "2026-09-03",
		},
		{
			id: "f-mila",
			personId: "mila",
			authorId: "alex",
			body: "Good passing today. Keep moving into an open lane after you release the puck.",
			visibility: "published",
			date: "2026-09-03",
		},
		{
			id: "f-alex",
			personId: "alex",
			authorId: "casey",
			body: "Strong support play. Leave a little more space for the forward on recovery.",
			visibility: "published",
			date: "2026-09-03",
		},
		{
			id: "private-sam",
			personId: "sam",
			authorId: "alex",
			body: "Ask which support position feels most natural before the next drill.",
			visibility: "private",
			date: "2026-09-03",
		},
	],
	conversations: [
		{
			id: "club",
			title: "General",
			subtitle: "All club members",
			accountIds: previewAccounts.map((account) => account.id),
		},
		{
			id: "youth",
			title: "Youth families",
			subtitle: "Parents & coaches",
			accountIds: ["alex", "jamie", "casey"],
		},
		{
			id: "session",
			title: "Thursday training",
			subtitle: "Sep 10 · Club training",
			accountIds: ["alex", "taylor", "casey"],
		},
		{
			id: "casey",
			title: "Casey Morgan",
			subtitle: "Coach",
			accountIds: ["alex", "casey"],
		},
	],
	messages: [
		{
			id: "m1",
			threadId: "club",
			accountId: "casey",
			author: "Casey Morgan",
			body: "Welcome back! Thursday training is on the schedule.",
			time: "9:10 AM",
		},
		{
			id: "m2",
			threadId: "club",
			accountId: "taylor",
			author: "Taylor Brooks",
			body: "See you poolside. Bringing a spare stick if anyone needs one.",
			time: "9:24 AM",
		},
		{
			id: "m3",
			threadId: "youth",
			accountId: "casey",
			author: "Casey Morgan",
			body: "Please bring both caps for Thursday. We’ll start with passing in pairs.",
			time: "10:30 AM",
		},
		{
			id: "m4",
			threadId: "session",
			accountId: "casey",
			author: "Casey Morgan",
			body: "Meet poolside 10 minutes early for a quick briefing.",
			time: "11:00 AM",
		},
		{
			id: "m5",
			threadId: "casey",
			accountId: "casey",
			author: "Casey Morgan",
			body: "I’ve shared feedback from last week. Happy to chat at training.",
			time: "Yesterday",
		},
	],
	notices: [
		{
			id: "n1",
			title: "Autumn registration",
			body: "Please complete your Autumn 2026 registration before September 14. Your current status is in Club.",
			program: "all",
			date: "2026-09-07",
			acknowledgedBy: [],
		},
		{
			id: "n2",
			title: "Pool entry has moved",
			body: "Use the east entrance on Thursday. The usual changing rooms are open.",
			program: "all",
			date: "2026-09-06",
			acknowledgedBy: [],
		},
	],
	equipment: [
		{
			id: "stick-014",
			name: "Youth stick",
			size: "Small · 014",
			condition: "ready",
		},
		{
			id: "fins-021",
			name: "Training fins",
			size: "38–40 · 021",
			condition: "ready",
		},
		{ id: "mask-008", name: "Mask", size: "Adult · 008", condition: "repair" },
		{
			id: "stick-015",
			name: "Club stick",
			size: "Medium · 015",
			condition: "ready",
		},
		{
			id: "caps-006",
			name: "Cap set",
			size: "Youth · 006",
			condition: "ready",
		},
	],
	loans: [
		{
			id: "loan-sam",
			itemId: "stick-014",
			personId: "sam",
			due: "2026-09-30",
			returned: false,
		},
		{
			id: "loan-jordan",
			itemId: "stick-015",
			personId: "jordan",
			due: "2026-09-05",
			returned: false,
		},
	],
	charges: members
		.filter((member) => member.programs.length > 0)
		.map((member) => ({ personId: member.id, amount: 16000 })),
	payments: members
		.filter((member) => member.programs.length > 0)
		.map((member) => ({
			id: `paid-${member.id}`,
			personId: member.id,
			amount:
				member.id === "sam"
					? 12000
					: member.id === "jordan"
						? 0
						: member.id === "harper"
							? 8000
							: 16000,
			note: "Season payment",
		})),
	trackers: [
		{
			id: "emergency",
			name: "Emergency contact verified",
			program: "all",
			kind: "check",
		},
		{
			id: "membership",
			name: "CUGA membership",
			program: "all",
			kind: "check",
		},
	],
	trackerValues: {
		"emergency:sam": "yes",
		"emergency:alex": "yes",
		"emergency:mila": "yes",
		"membership:sam": "yes",
	},
	reminders: true,
};
