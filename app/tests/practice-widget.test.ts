import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { Account, ClubEvent, Member } from "../src/domain/app-types";
import {
	practiceWidgetSnapshot,
	practiceWidgetTimeline,
	widgetReplyRequest,
} from "../src/domain/practice-widget";

const account: Account = {
	id: "account",
	personId: "adult",
	name: "Adult",
	children: ["child"],
	coachPrograms: [],
	admin: false,
};
const person = (id: string): Member => ({
	id,
	name: id,
	programs: ["club"],
	position: "",
	rating: 0,
	registration: "approved",
	goal: "",
	steps: 0,
});
const event: ClubEvent = {
	id: "practice",
	title: "Sunday Practice",
	date: "2026-11-08",
	start: "19:30",
	end: "21:15",
	venue: "MNP Centre",
	program: "club",
	kind: "hockey",
	signup: "open",
	cancelled: false,
	description: "",
	parts: [
		{
			id: "training",
			title: "Training",
			kind: "training",
			start: "19:30",
			end: "20:15",
		},
		{
			id: "hockey",
			title: "Hockey",
			kind: "hockey",
			start: "20:15",
			end: "21:15",
		},
	],
};
const now = Date.parse("2026-11-07T19:00:00Z");
const data = {
	...initialAppData,
	timeZone: "America/Edmonton",
	members: [person("adult"), person("child"), person("other")],
	events: [event],
	responses: [
		{
			eventId: "practice",
			personId: "adult",
			response: "going" as const,
			attendance: "unmarked" as const,
			partIds: ["hockey"],
			declinedPartIds: ["training"],
		},
	],
};
test("widget identifies the selected household member and each practice part", (): void => {
	const result = practiceWidgetSnapshot(data, account, "adult", now);
	expect(result.kind).toBe("practice");
	if (result.kind !== "practice") throw new Error("Practice unavailable");
	expect(result.parts.map((part) => part.response)).toEqual([
		"unavailable",
		"going",
	]);
	expect(result.time).toBe("7:30–9:15pm");
	expect(result.signup).toBe("open");
});
test("widget never includes another person or a lineup from another event", (): void => {
	const lineup = {
		eventId: "practice",
		assignments: [
			{ personId: "adult", team: "Black" as const, reserve: false },
			{ personId: "child", team: "White" as const, reserve: false },
		],
	};
	expect(practiceWidgetSnapshot(data, account, "other", now, lineup)).toEqual({
		kind: "unavailable",
	});
	const result = practiceWidgetSnapshot(data, account, "adult", now, lineup);
	expect(result.kind === "practice" ? result.assignments.length : -1).toBe(1);
	const stale = practiceWidgetSnapshot(data, account, "adult", now, {
		...lineup,
		eventId: "old",
	});
	expect(stale.kind === "practice" ? stale.assignments : undefined).toEqual([]);
});
test("widget reports no upcoming practice when the event is cancelled", (): void => {
	expect(
		practiceWidgetSnapshot(
			{ ...data, events: [{ ...event, cancelled: true }] },
			account,
			"adult",
			now,
		),
	).toEqual({ kind: "empty", personName: "adult" });
});
test("widget shows the next practice with each reply and moves on when it ends", (): void => {
	const later: ClubEvent = {
		...event,
		id: "later",
		title: "Wednesday Practice",
		date: "2026-11-11",
		parts: undefined,
	};
	const timeline = practiceWidgetTimeline(
		{ ...data, events: [event, later] },
		account,
		"adult",
		now,
		"key",
		{
			eventId: "practice",
			assignments: [
				{
					personId: "adult",
					team: "Black",
					position: "2 · right forward",
					reserve: false,
				},
			],
		},
	);
	expect(timeline.map((entry) => entry.props.title)).toEqual([
		"Sunday Practice",
		"Wednesday Practice",
		"No upcoming practices",
	]);
	const first = timeline.at(0)?.props;
	expect(first?.rows.map((row) => row.reply)).toEqual(["no", "yes"]);
	expect(first?.rows.map((row) => row.yes)).toEqual(["", ""]);
	expect(first?.details).toBe("MNP Centre");
	expect(first?.lineupNote).toBe("");
	expect([first?.weekday, first?.day, first?.month]).toEqual([
		"SUN",
		"8",
		"NOV",
	]);
	expect(first?.lineup).toEqual(["Black Team · 2 - Right Forward"]);
	expect(timeline.at(1)?.props.rows.at(0)?.reply).toBe("needed");
	expect(timeline.at(1)?.props.lineupNote).toBe("");
	expect(timeline.at(1)?.timestamp).toBe(Date.parse("2026-11-09T03:15:00Z"));
});
test("widget never asks a signed-in member with no practices to sign in", (): void => {
	const [entry] = practiceWidgetTimeline(
		{ ...data, events: [] },
		account,
		"adult",
		now,
		"key",
	);
	expect(entry?.props.title).toBe("No upcoming practices");
	expect(entry?.props.rows).toEqual([]);
});
const unanswered = { ...data, responses: [] };
const linkParams = (url: string): Record<string, string> =>
	Object.fromEntries(new URL(url).searchParams);
test("widget offers yes and no only while a reply is needed", (): void => {
	const [entry] = practiceWidgetTimeline(
		unanswered,
		account,
		"adult",
		now,
		"key",
	);
	const hockey = entry?.props.rows.at(1);
	expect(hockey?.reply).toBe("needed");
	expect(linkParams(hockey?.yes ?? "")).toEqual({
		event: "practice",
		person: "adult",
		reply: "yes",
		replyPart: "hockey",
		widget: "key",
	});
	const [locked] = practiceWidgetTimeline(
		unanswered,
		account,
		"adult",
		now,
		"",
	);
	expect(locked?.props.rows.map((row) => row.yes)).toEqual(["", ""]);
});
test("widget reply links only act with this device's key", (): void => {
	const [entry] = practiceWidgetTimeline(
		unanswered,
		account,
		"adult",
		now,
		"key",
	);
	const params = linkParams(entry?.props.rows.at(1)?.yes ?? "");
	expect(widgetReplyRequest(params, "key", unanswered, account, now)).toEqual({
		eventId: "practice",
		personId: "adult",
		response: "going",
		partIds: ["hockey"],
		declinedPartIds: [],
	});
	expect(
		widgetReplyRequest(params, "other", unanswered, account, now),
	).toBeUndefined();
	expect(
		widgetReplyRequest(
			{ ...params, person: "other" },
			"key",
			unanswered,
			account,
			now,
		),
	).toBeUndefined();
});
test("widget says when teams are not published for the next practice", (): void => {
	const [entry] = practiceWidgetTimeline(data, account, "adult", now, "key", {
		eventId: "practice",
		assignments: [],
	});
	expect(entry?.props.lineup).toEqual([]);
	expect(entry?.props.lineupNote).toBe("Teams not published yet");
});
