import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { visibleAppData } from "../src/domain/app-visibility";
import {
	fitnessLowerIsBetter,
	formatFitnessValue,
	parseFitnessValue,
} from "../src/domain/fitness";
import { logFitnessResult } from "../src/domain/fitness-log";
import {
	type FitnessState,
	fitnessSummary,
	reduceFitness,
} from "../src/domain/fitness-model";
import { personalFitnessRows } from "../src/domain/personal-fitness";
import {
	initialResourceAudience,
	type Resource,
	resourceMatches,
} from "../src/domain/resources";
import { publicFeedback, shoutoutSummary } from "../src/domain/shoutouts";
import { videoEmbedUrl } from "../src/domain/video-embed";

const state: FitnessState = {
	tests: [
		{
			_id: "swim",
			name: "Distance swim",
			unit: "distance",
			archived: false,
			revision: 0,
		},
	],
	sessions: [],
	results: [],
};
const event = initialAppData.events.find(
	(entry) => entry.kind === "training" && !entry.cancelled,
);
if (!event) throw new Error("Practice fixture required.");
const input = {
	testId: "swim",
	eventId: event.id,
	personId: "sam",
	value: "42.25",
	notes: "Good turns",
	operationKey: "log-one",
};
const player = {
	...primaryAccount,
	coachPrograms: [],
	admin: false,
	personId: "sam",
	children: [],
};

test("swim distance preserves hundredths and rejects invalid entries", (): void => {
	expect(parseFitnessValue("distance", "42.25")).toBe(42.25);
	expect(formatFitnessValue("distance", 42.25)).toBe("42.25");
	for (const value of ["-2", "NaN", "1.123", "1000001", "1e3"])
		expect(() => parseFitnessValue("distance", value)).toThrow();
	expect(fitnessLowerIsBetter({ unit: "time" })).toBe(true);
	expect(fitnessLowerIsBetter({ unit: "time", lowerIsBetter: false })).toBe(
		false,
	);
	expect(fitnessLowerIsBetter({ unit: "distance" })).toBe(false);
});
test("best direction is configurable and cannot be silently changed", (): void => {
	const scores = [20, 40].map((value) => ({
		testId: "swim",
		sessionId: String(value),
		seasonId: "season",
		personId: "sam",
		date: "2026-10-01",
		value,
		notes: "",
	}));
	expect(fitnessSummary("time", scores, false)?.best).toBe(40);
	expect(fitnessSummary("distance", scores, true)?.best).toBe(20);
	const created = reduceFitness(state, primaryAccount, initialAppData, {
		type: "save-test",
		id: "endurance",
		input: { name: "Breath hold", unit: "time", lowerIsBetter: false },
	});
	const edited = reduceFitness(created, primaryAccount, initialAppData, {
		type: "save-test",
		id: "endurance",
		input: {
			testId: "endurance",
			revision: 0,
			name: "Static hold",
			unit: "time",
		},
	});
	expect(
		edited.tests.find((entry) => entry._id === "endurance")?.lowerIsBetter,
	).toBe(false);
	expect(() =>
		reduceFitness(created, primaryAccount, initialAppData, {
			type: "save-test",
			id: "endurance",
			input: {
				testId: "endurance",
				revision: 0,
				name: "Hold",
				unit: "time",
				lowerIsBetter: true,
			},
		}),
	).toThrow("scoring direction");
});
test("poolside logging links practice and program, retries once, never overwrites", (): void => {
	const next = logFitnessResult(
		state,
		primaryAccount,
		initialAppData,
		input,
		"session",
	);
	expect(next.sessions.at(0)?.eventId).toBe(event.id);
	expect(next.sessions.at(0)?.programId).toBe(event.program);
	expect(next.results.at(0)?.value).toBe(42.25);
	expect(
		logFitnessResult(next, primaryAccount, initialAppData, input, "other"),
	).toBe(next);
	expect(() =>
		logFitnessResult(
			next,
			primaryAccount,
			initialAppData,
			{ ...input, value: "50" },
			"other",
		),
	).toThrow("already recorded");
	expect(() =>
		logFitnessResult(
			next,
			primaryAccount,
			initialAppData,
			{ ...input, operationKey: "duplicate" },
			"other",
		),
	).toThrow("already recorded");
	expect(() =>
		logFitnessResult(state, player, initialAppData, input, "other"),
	).toThrow("Coach access");
	expect(() =>
		logFitnessResult(
			state,
			primaryAccount,
			initialAppData,
			{ ...input, value: "" },
			"other",
		),
	).toThrow("Add a result");
});
test("personal results respect self, family, coaching and unrelated boundaries", (): void => {
	const next = logFitnessResult(
		state,
		primaryAccount,
		initialAppData,
		input,
		"session",
	);
	const sam = initialAppData.members.find((entry) => entry.id === "sam");
	if (!sam) throw new Error("Player required");
	const season = next.sessions.at(0)?.seasonId ?? "";
	expect(personalFitnessRows(next, player, sam, season)).toHaveLength(1);
	expect(
		personalFitnessRows(
			next,
			{ ...player, personId: "jamie", children: ["sam"] },
			sam,
			season,
		),
	).toHaveLength(1);
	expect(
		personalFitnessRows(next, { ...player, personId: "taylor" }, sam, season),
	).toHaveLength(0);
});
test("recognition supports optional notes, immutable retries, anonymity and admin removal", (): void => {
	const feedback = {
		id: "recognition",
		kind: "shoutout",
		category: "mvp",
		personId: "sam",
		authorId: "spoofed",
		body: "",
		visibility: "published",
		date: event.date,
		eventId: event.id,
	} as const;
	const next = reduceApp(initialAppData, player, {
		type: "save-feedback",
		feedback,
	});
	expect(reduceApp(next, player, { type: "save-feedback", feedback })).toBe(
		next,
	);
	expect(
		visibleAppData(next, player).feedback.find(
			(entry) => entry.id === feedback.id,
		)?.authorId,
	).toBe("anonymous");
	expect(publicFeedback({ ...feedback, authorId: player.id }).authorId).toBe(
		"anonymous",
	);
	expect(
		shoutoutSummary(next.feedback).find((entry) => entry.category === "mvp")
			?.count,
	).toBe(1);
	expect(() =>
		reduceApp(next, player, {
			type: "save-feedback",
			feedback: { ...feedback, category: "great_session" },
		}),
	).toThrow();
	expect(() =>
		reduceApp(next, player, { type: "delete-feedback", id: feedback.id }),
	).toThrow();
	expect(
		reduceApp(next, primaryAccount, {
			type: "delete-feedback",
			id: feedback.id,
		}).feedback.some((entry) => entry.id === feedback.id),
	).toBe(false);
	expect(
		shoutoutSummary([{ ...feedback, kind: "coaching", visibility: "private" }]),
	).toHaveLength(0);
});
test("video search matches notes and current tagged names as well as titles", (): void => {
	expect(initialResourceAudience()).toBe("coaches");
	expect(initialResourceAudience("sam")).toBe("players");
	const resource: Resource = {
		id: "clip",
		clubId: "club",
		kind: "video",
		title: "Turns",
		description: "Poolside feedback",
		personIds: ["sam"],
		personNames: { sam: "Sam Rivera" },
		audience: "players",
		archived: false,
		revision: 0,
		updatedAt: 1,
	};
	for (const search of ["turns", "POOLside", "sam rivera"])
		expect(
			resourceMatches(resource, { kind: "video", archived: false, search }),
		).toBe(true);
	expect(
		resourceMatches(resource, {
			kind: "video",
			archived: false,
			search: "not present",
		}),
	).toBe(false);
});
test("external video embeds allow only recognized HTTPS providers", (): void => {
	expect(videoEmbedUrl("https://player.vimeo.com/video/1234567")).toBe(
		"https://player.vimeo.com/video/1234567",
	);
	expect(videoEmbedUrl("https://vimeo.com/1234567/abcdef")).toBe(
		"https://player.vimeo.com/video/1234567?h=abcdef",
	);
	expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
		"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
	);
	expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
		"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
	);
	expect(videoEmbedUrl("https://vimeo.com/1234567")).toBe(
		"https://player.vimeo.com/video/1234567",
	);
	for (const value of [
		"javascript:alert(1)",
		"http://youtube.com/watch?v=dQw4w9WgXcQ",
		"https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
		"https://other.test/video",
	])
		expect(videoEmbedUrl(value)).toBeUndefined();
});
