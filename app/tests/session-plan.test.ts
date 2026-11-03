import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	previewSessionPlanCommandAtom,
	previewSessionPlanPublicationAtom,
	previewSessionPlansAtom,
	previewSharedSessionPlansAtom,
} from "../src/demo/session-plan-state";
import {
	canReadSharedSessionPlan,
	emptySessionPlan,
	moveSessionDrill,
	nextSessionPlan,
	normalizeSessionPlan,
	planMinutes,
	publishSessionPlan,
	type SessionPlanCommand,
	sameSessionPlan,
	sessionPlanRequestPayload,
	sharedSessionPlan,
	validateSessionPlan,
} from "../src/domain/session-plan";

const command: SessionPlanCommand = {
	eventId: "practice",
	partId: "training",
	requestId: "fictional-plan-request",
	revision: 0,
	objective: " Support the receiver ",
	notes: " Keep rotations short ",
	drills: [
		{
			id: "first",
			title: " Passing lanes ",
			minutes: 10,
			instructions: " Pass, then move ",
			media: [
				{
					id: "link",
					label: " Demo clip ",
					source: "link",
					url: "https://example.test/video",
				},
			],
		},
		{
			id: "second",
			title: "Three on two",
			minutes: 15,
			instructions: "Find support",
			media: [
				{
					id: "resource",
					label: "Club drill",
					source: "resource",
					resourceId: "club-resource",
				},
			],
		},
	],
};

test("structured plans preserve ordered drills, duration, instructions and typed media without rewriting legacy notes", (): void => {
	expect(validateSessionPlan(command)).toBeUndefined();
	const legacy = emptySessionPlan("Earlier plain-text plan");
	expect(legacy.notes).toBe("Earlier plain-text plan");
	const saved = nextSessionPlan(legacy, command, 1234);
	expect(saved.revision).toBe(1);
	expect(saved.objective).toBe("Support the receiver");
	expect(saved.updatedAt).toBe(1234);
	expect(saved.drills.map((drill) => drill.id)).toEqual(["first", "second"]);
	expect(saved.drills.at(0)?.instructions).toBe("Pass, then move");
	expect(planMinutes(saved)).toBe(25);
	expect(legacy.notes).toBe("Earlier plain-text plan");
	expect(
		validateSessionPlan(emptySessionPlan("x".repeat(10000))),
	).toBeUndefined();
	expect(
		validateSessionPlan(emptySessionPlan("x".repeat(10001))),
	).toBeDefined();
});

test("shared publication is explicit, revision guarded and never projects coaching notes or private media", (): void => {
	const current = nextSessionPlan(
		emptySessionPlan("Legacy private note"),
		command,
		1,
	);
	expect(sharedSessionPlan(current, () => true)).toBeUndefined();
	const publication = {
		eventId: command.eventId,
		partId: command.partId,
		requestId: "publish-fixture-request",
		revision: 1,
		published: true,
	};
	const published = publishSessionPlan(current, publication, 2);
	const shared = sharedSessionPlan(published, () => false);
	expect(published.notes).toBe("Keep rotations short");
	expect(shared && "notes" in shared).toBe(false);
	expect(shared?.revision).toBe(2);
	expect(shared?.drills.at(1)?.media).toEqual([]);
	expect(shared?.drills.at(0)?.media.at(0)?.source).toBe("link");
	expect(() => publishSessionPlan(published, publication, 3)).toThrow(
		"plan changed",
	);
	const changed = nextSessionPlan(published, { ...command, revision: 2 }, 4);
	expect(changed.published).toBe(false);
	expect(changed.publishedAt).toBeUndefined();
	expect(sharedSessionPlan(changed, () => true)).toBeUndefined();
	expect(() =>
		publishSessionPlan(
			emptySessionPlan("Private notes only"),
			{ ...publication, revision: 0 },
			5,
		),
	).toThrow("Coaching notes stay private");
});

test("published plans follow current eligible households and canonical active profiles", (): void => {
	const event = initialAppData.events.find((entry) => entry.id === "club-thu");
	if (!event) throw new Error("Missing event fixture.");
	const guardian = {
		...primaryAccount,
		admin: false,
		coachPrograms: [],
		personId: "jamie",
		children: ["sam"],
	};
	expect(
		canReadSharedSessionPlan(guardian, event, initialAppData.members),
	).toBe(true);
	expect(
		canReadSharedSessionPlan(
			{ ...guardian, children: [] },
			event,
			initialAppData.members,
		),
	).toBe(false);
	expect(
		canReadSharedSessionPlan(
			guardian,
			{ ...event, eligiblePersonIds: [] },
			initialAppData.members,
		),
	).toBe(false);
	for (const update of [{ archived: true }, { mergedInto: "other" }])
		expect(
			canReadSharedSessionPlan(
				guardian,
				event,
				initialAppData.members.map((person) =>
					person.id === "sam" ? { ...person, ...update } : person,
				),
			),
		).toBe(false);
	expect(
		canReadSharedSessionPlan(
			primaryAccount,
			{ ...event, cancelled: true },
			initialAppData.members,
		),
	).toBe(false);
});

test("preview publication uses the real revision, private draft and safe-replay contracts", (): void => {
	const store = createStore();
	const eventId = "club-thu";
	store.set(previewDataAtom, initialAppData);
	store.set(previewSessionPlansAtom, {});
	const draft = {
		...command,
		eventId,
		partId: undefined,
		drills: command.drills.slice(0, 1),
	};
	store.set(previewSessionPlanCommandAtom, draft);
	const publication = {
		eventId,
		revision: 1,
		published: true,
		requestId: "preview-publish-request",
	};
	store.set(previewSessionPlanPublicationAtom, publication);
	store.set(previewSessionPlanPublicationAtom, publication);
	expect(store.get(previewSessionPlansAtom)[eventId]?.revision).toBe(2);
	store.set(previewAccountIdAtom, "jamie");
	const shared = store.get(previewSharedSessionPlansAtom)[eventId];
	expect(shared?.objective).toBe("Support the receiver");
	expect(shared && "notes" in shared).toBe(false);
	expect(() =>
		store.set(previewSessionPlanPublicationAtom, {
			...publication,
			revision: 2,
			published: false,
			requestId: "player-publish-request",
		}),
	).toThrow("Coach access");
	store.set(previewAccountIdAtom, "alex");
	store.set(previewSessionPlanCommandAtom, draft);
	expect(store.get(previewSessionPlansAtom)[eventId]?.published).toBe(true);
	store.set(previewSessionPlanCommandAtom, {
		...draft,
		revision: 2,
		requestId: "changed-preview-session-plan",
		notes: "New private coaching note",
	});
	expect(store.get(previewSharedSessionPlansAtom)[eventId]).toBeUndefined();
	expect(() =>
		store.set(previewSessionPlanPublicationAtom, {
			...publication,
			requestId: "stale-preview-publish",
		}),
	).toThrow("plan changed");
});

test("plan validation rejects invalid durations, duplicate identities, oversized data and unsafe media", (): void => {
	const drill = command.drills.at(0);
	if (!drill) throw new Error("Missing drill fixture");
	for (const minutes of [0, 241, 1.5, Number.NaN])
		expect(
			validateSessionPlan({ ...command, drills: [{ ...drill, minutes }] }),
		).toBeDefined();
	for (const url of [
		"javascript:alert(1)",
		"http://example.test",
		"https://user:secret@example.test",
		"https://example.test/".concat("x".repeat(2048)),
	])
		expect(
			validateSessionPlan({
				...command,
				drills: [
					{
						...drill,
						media: [{ id: "bad", source: "link", label: "Unsafe", url }],
					},
				],
			}),
		).toBeDefined();
	expect(
		validateSessionPlan({ ...command, drills: [{ ...drill, title: " " }] }),
	).toBeDefined();
	expect(
		validateSessionPlan({ ...command, drills: [drill, drill] }),
	).toBeDefined();
	expect(
		validateSessionPlan({
			...command,
			drills: [{ ...drill, instructions: "x".repeat(2001) }],
		}),
	).toBeDefined();
	expect(
		validateSessionPlan({ ...command, objective: "x".repeat(301) }),
	).toBeDefined();
	expect(
		validateSessionPlan({
			...command,
			drills: [
				{
					...drill,
					media: [
						{ id: "bad", source: "resource", label: "Missing", resourceId: "" },
					],
				},
			],
		}),
	).toBeDefined();
});

test("plan revision checks preserve concurrent work and canonical operation payloads distinguish sessions and parts", (): void => {
	const saved = nextSessionPlan(emptySessionPlan(), command, 1234);
	expect(() =>
		nextSessionPlan(saved, { ...command, notes: "Overwrite" }, 2000),
	).toThrow("plan changed");
	expect(sameSessionPlan(command, normalizeSessionPlan(command))).toBe(true);
	expect(sessionPlanRequestPayload(command)).toBe(
		sessionPlanRequestPayload({
			...command,
			revision: 50,
			requestId: "another-request-key",
			notes: command.notes.trim(),
		}),
	);
	expect(sessionPlanRequestPayload(command)).not.toBe(
		sessionPlanRequestPayload({ ...command, eventId: "other-practice" }),
	);
	expect(sessionPlanRequestPayload(command)).not.toBe(
		sessionPlanRequestPayload({ ...command, partId: "hockey" }),
	);
	expect(sessionPlanRequestPayload(command)).not.toBe(
		sessionPlanRequestPayload({ ...command, notes: "Different note" }),
	);
});

test("accessible drill reordering is bounded and never duplicates or drops blocks or attachments", (): void => {
	const reordered = moveSessionDrill(command.drills, "first", 1);
	expect(reordered.map((drill) => drill.id)).toEqual(["second", "first"]);
	expect(
		reordered.flatMap((drill) => drill.media.map((media) => media.id)),
	).toEqual(["resource", "link"]);
	expect(moveSessionDrill(command.drills, "first", -1)).toBe(command.drills);
	expect(moveSessionDrill(command.drills, "second", 1)).toBe(command.drills);
	expect(moveSessionDrill(command.drills, "missing", 1)).toBe(command.drills);
	expect(command.drills.at(0)?.id).toBe("first");
});

test("free-text plans and multiline goals survive save, publish and replay while notes stay private", (): void => {
	const body = "**Game plan**\nWarm up, then *small-sided games*.";
	const goals =
		"Game FOCUS\n- Everyone on bottom, tight\n- Sub on the fly\n- Balance the load";
	const input = { ...command, objective: "", drills: [], body, goals };
	const saved = nextSessionPlan(emptySessionPlan(), input, 100);
	expect(saved.body).toBe(body);
	expect(saved.goals).toBe(goals);
	const published = publishSessionPlan(
		saved,
		{
			eventId: input.eventId,
			revision: saved.revision,
			requestId: "publish-free-text",
			published: true,
		},
		200,
	);
	const shared = sharedSessionPlan(published, () => false);
	expect(shared?.body).toBe(body);
	expect(shared?.goals).toBe(goals);
	expect(shared).not.toHaveProperty("notes");
	expect(sessionPlanRequestPayload(input)).not.toBe(
		sessionPlanRequestPayload({ ...input, goals: `${goals}\n- Service` }),
	);
	expect(
		validateSessionPlan({ ...input, body: "a".repeat(20001) }),
	).toBeDefined();
	expect(
		validateSessionPlan({ ...input, goals: "a".repeat(10001) }),
	).toBeDefined();
});
