import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import { visibleNotices } from "../src/domain/app-rules";
import type {
	Account,
	ClubEvent,
	Member,
	Notice,
} from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import type { FitnessState } from "../src/domain/fitness-model";
import {
	homeFitnessSnapshot,
	homeNextPractice,
	homePendingResponse,
	homeRecentConversations,
	homeReflectionPractice,
} from "../src/domain/home-summary";
import type { ConversationSummary } from "../src/domain/messaging";
import { bannerNotices } from "../src/domain/notices";

const player = (id: string): Member => ({
	id,
	name: id,
	programs: ["club"],
	position: "",
	rating: 0,
	registration: "approved",
	goal: "",
	steps: 0,
});
const account: Account = {
	id: "account",
	personId: "self",
	name: "Self",
	children: ["child"],
	coachPrograms: [],
	admin: false,
};
const people = [player("self"), player("child"), player("other")];
const now = clubTimestamp("2026-11-02", "12:00");
const event = (id: string, extra: Partial<ClubEvent> = {}): ClubEvent => ({
	id,
	title: id,
	date: "2026-11-03",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "open",
	cancelled: false,
	description: "",
	...extra,
});
const data = { ...initialAppData, members: people, responses: [] };

test("summary chooses one eligible household practice, not a social event, ended practice or cancelled session", (): void => {
	const events = [
		event("later", { date: "2026-11-08" }),
		event("social", { kind: "social" }),
		event("cancelled", { cancelled: true }),
		event("ended", { date: "2026-11-01" }),
		event("not-invited", { eligiblePersonIds: ["other"] }),
		event("next"),
	];
	expect(homeNextPractice({ ...data, events }, account, now)?.id).toBe("next");
	expect(events.at(0)?.id).toBe("later");
	expect(
		homeNextPractice({ ...data, events: [] }, account, now),
	).toBeUndefined();
});

test("reflection shortcuts select the latest completed permitted practice without mutating event order", (): void => {
	const events = [
		event("older", { date: "2026-10-20" }),
		event("future"),
		event("social", { date: "2026-11-01", kind: "social" }),
		event("cancelled", { date: "2026-11-01", cancelled: true }),
		event("other-person", { date: "2026-11-01", eligiblePersonIds: ["other"] }),
		event("latest", { date: "2026-10-30" }),
	];
	const person = people.at(0);
	if (!person) throw new Error("Missing player fixture");
	expect(homeReflectionPractice({ ...data, events }, person, now)?.id).toBe(
		"latest",
	);
	expect(events.at(0)?.id).toBe("older");
	expect(
		homeReflectionPractice({ ...data, events: [event("future")] }, person, now),
	).toBeUndefined();
});

test("response action exists only for eligible unanswered household players in an open nearby practice", (): void => {
	const practice = event("practice", {
		eligiblePersonIds: ["self", "child", "other"],
	});
	const pending = homePendingResponse(
		{
			...data,
			events: [practice],
			responses: [
				{
					eventId: practice.id,
					personId: "self",
					response: "going",
					attendance: "unmarked",
				},
			],
		},
		account,
		now,
	);
	expect(pending?.people.map((person) => person.id)).toEqual(["child"]);
	for (const unavailable of [
		event("closed", { signup: "closed" }),
		event("scheduled", { signup: "scheduled" }),
		event("far", { date: "2026-11-12" }),
		event("other", { eligiblePersonIds: ["other"] }),
	])
		expect(
			homePendingResponse({ ...data, events: [unavailable] }, account, now),
		).toBeUndefined();
	expect(
		homePendingResponse(
			{
				...data,
				events: [event("practice")],
				responses: people.map((person) => ({
					eventId: "practice",
					personId: person.id,
					response: "unavailable",
					attendance: "unmarked",
				})),
			},
			account,
			now,
		),
	).toBeUndefined();
});

const thread = (
	id: string,
	updatedAt: number,
	withMessage = true,
): ConversationSummary => ({
	id,
	title: id,
	subtitle: "",
	accountIds: [account.id],
	updatedAt,
	unread: 0,
	readThrough: 0,
	latest: withMessage
		? {
				id: `message-${id}`,
				threadId: id,
				accountId: account.id,
				author: "Self",
				body: id,
				time: "11:00",
			}
		: undefined,
});

test("recent message preview is bounded to three actual conversations and does not mutate the provider", (): void => {
	const threads = [
		thread("oldest", 1),
		thread("newest", 5),
		thread("empty", 9, false),
		thread("third", 3),
		thread("second", 4),
	];
	expect(homeRecentConversations(threads).map((entry) => entry.id)).toEqual([
		"newest",
		"second",
		"third",
	]);
	expect(threads.at(0)?.id).toBe("oldest");
	expect(homeRecentConversations([thread("empty", 1, false)])).toEqual([]);
});

const fitness: FitnessState = {
	tests: [
		{
			_id: "swim",
			name: "50 m swim",
			unit: "time",
			archived: false,
			revision: 0,
		},
		{
			_id: "lengths",
			name: "Pool lengths",
			unit: "count",
			archived: false,
			revision: 0,
		},
	],
	sessions: [],
	results: [
		{
			testId: "swim",
			personId: "self",
			sessionId: "older",
			seasonId: "2025-2026",
			date: "2026-04-01",
			value: 90,
			notes: "",
		},
		{
			testId: "lengths",
			personId: "self",
			sessionId: "latest",
			seasonId: "2026-2027",
			date: "2026-11-01",
			value: 18,
			notes: "",
		},
		{
			testId: "swim",
			personId: "self",
			sessionId: "future",
			seasonId: "2026-2027",
			date: "2026-12-01",
			value: 80,
			notes: "",
		},
	],
};

test("fitness summary uses actual latest results across seasons, excluding future dates and respecting private profiles", (): void => {
	const self = player("self");
	const snapshot = homeFitnessSnapshot(fitness, account, self, "2026-11-02");
	expect(snapshot?.row.test.name).toBe("Pool lengths");
	expect(snapshot?.row.history.at(0)?.value).toBe(18);
	expect(snapshot?.seasonId).toBe("2026-2027");
	expect(
		homeFitnessSnapshot(
			{ ...fitness, results: fitness.results.slice(0, 1) },
			account,
			self,
			"2026-11-02",
		)?.seasonId,
	).toBe("2025-2026");
	expect(
		homeFitnessSnapshot(
			fitness,
			{ ...account, personId: "other", children: [] },
			self,
			"2026-11-02",
		),
	).toBeUndefined();
	expect(
		homeFitnessSnapshot(
			{ ...fitness, results: [] },
			account,
			self,
			"2026-11-02",
		),
	).toBeUndefined();
});

test("announcement highlight preserves live dates, program visibility and private dismissal", (): void => {
	const notice = (id: string, extra: Partial<Notice> = {}): Notice => ({
		id,
		title: id,
		body: id,
		date: "2026-11-01",
		expiresAt: "2026-11-10",
		program: "all",
		acknowledgedBy: [],
		...extra,
	});
	const notices = [
		notice("future", { date: "2026-11-03" }),
		notice("expired", { expiresAt: "2026-11-02" }),
		notice("dismissed", { dismissedBy: [account.id] }),
		notice("other-program", { program: "unrelated" }),
		notice("live", { program: "club" }),
	];
	expect(
		bannerNotices(
			visibleNotices({ ...data, notices }, account),
			account.id,
			"2026-11-02",
		).map((entry) => entry.id),
	).toEqual(["live"]);
});
