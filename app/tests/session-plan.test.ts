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
	canReadSessionPlanImage,
	canReadSharedSessionPlan,
	emptySessionPlan,
	maxSessionPlanBodyLength,
	maxSessionPlanMedia,
	nextSessionPlan,
	normalizeSessionPlan,
	planBodyBlocks,
	planResourceIds,
	publishSessionPlan,
	type SessionPlanCommand,
	sameSessionPlan,
	sessionPlanRequestPayload,
	sharedSessionPlan,
	validateSessionPlan,
} from "../src/domain/session-plan";

const command: SessionPlanCommand = {
	eventId: "club-thu",
	requestId: "fictional-plan-request",
	revision: 0,
	body: " Warm up together.[[plan-image:diagram]]\n\nPlay three on two.[[plan-image:pool]] ",
	notes: " Private coaching notes ",
	media: [
		{
			id: "diagram",
			source: "image",
			label: " Practice diagram ",
			fileId: "uploaded-diagram",
		},
		{ id: "pool", source: "image", label: "Pool", fileId: "uploaded-pool" },
	],
};
const publication = {
	eventId: command.eventId,
	requestId: "fictional-publication",
	revision: 1,
	published: true,
};

test("freeform plans retain text, inline uploaded images and private notes", (): void => {
	expect(validateSessionPlan(command)).toBeUndefined();
	const saved = nextSessionPlan(emptySessionPlan(), command, 123);
	expect(saved.body).toBe(command.body.trim());
	expect(saved.notes).toBe(command.notes.trim());
	expect(saved.media.map((media) => media.id)).toEqual(["diagram", "pool"]);
	expect(saved.revision).toBe(1);
	expect(Boolean(saved.published)).toBe(false);
	expect(saved).not.toHaveProperty("drills");
	expect(saved).not.toHaveProperty("objective");
	expect(saved).not.toHaveProperty("goals");
	expect(planResourceIds(saved)).toEqual([]);
	expect(normalizeSessionPlan(saved)).toEqual(normalizeSessionPlan(command));
});
test("publication is explicit and revision guarded, excludes notes and inaccessible files", (): void => {
	const saved = nextSessionPlan(emptySessionPlan(), command, 1);
	expect(sharedSessionPlan(saved, () => true)).toBeUndefined();
	const published = publishSessionPlan(saved, publication, 2);
	const shared = sharedSessionPlan(published, () => false);
	expect(shared?.body).toBe(command.body.trim());
	expect(shared?.media.map((media) => media.id)).toEqual(["diagram", "pool"]);
	expect(shared).not.toHaveProperty("notes");
	expect(() =>
		publishSessionPlan(published, { ...publication, revision: 0 }, 3),
	).toThrow("Review the latest version");
	const changed = nextSessionPlan(published, { ...command, revision: 2 }, 4);
	expect(changed.published).toBe(true);
	expect(changed.publishedAt).toBe(2);
	expect(sharedSessionPlan(changed, () => true)?.body).toBe(changed.body);
	expect(() =>
		publishSessionPlan(
			{ ...emptySessionPlan(), notes: "Private notes only" },
			{ ...publication, revision: 0 },
			5,
		),
	).toThrow("Coaching notes stay private");
	expect(emptySessionPlan()).toEqual({
		body: "",
		media: [],
		notes: "",
		revision: 0,
	});
});
test("published plans follow current eligible households and active profiles", (): void => {
	const event = initialAppData.events.find((entry) => entry.id === "club-thu");
	if (!event) throw new Error("Missing practice.");
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
test("validation bounds freeform text and attachment identities and allows only supported secure media", (): void => {
	expect(
		validateSessionPlan({
			...command,
			body: "x".repeat(maxSessionPlanBodyLength),
			media: [],
		}),
	).toBeUndefined();
	expect(
		validateSessionPlan({
			...command,
			body: "x".repeat(maxSessionPlanBodyLength + 1),
		}),
	).toContain("20,000");
	expect(
		validateSessionPlan({ ...command, notes: "x".repeat(10001) }),
	).toContain("10,000");
	expect(
		validateSessionPlan({
			...command,
			media: Array.from({ length: maxSessionPlanMedia + 1 }, (_, index) => ({
				id: `file-${index}`,
				source: "resource",
				label: "File",
				resourceId: "file",
			})),
		}),
	).toContain("20");
	expect(
		validateSessionPlan({
			...command,
			media: command.media.slice(0, 1).flatMap((media) => [media, media]),
		}),
	).toContain("unique");
	for (const url of [
		"http://example.test/sheet.pdf",
		"https://example.test/website",
		"https://name:password@example.test/sheet.pdf",
		"javascript:alert(1)",
	])
		expect(
			validateSessionPlan({
				...command,
				media: [{ id: "link", source: "link", label: "Invalid", url }],
			}),
		).toContain("uploaded images only");
	for (const url of [
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		"https://vimeo.com/123456",
		"https://example.test/sheet.pdf",
		"https://example.test/image.png",
	])
		expect(
			validateSessionPlan({
				...command,
				media: [{ id: "link", source: "link", label: "Supported", url }],
			}),
		).toContain("uploaded images only");
});
test("revision and canonical payloads preserve concurrent work, retries and exact scope", (): void => {
	const saved = nextSessionPlan(emptySessionPlan(), command, 1);
	expect(() => nextSessionPlan(saved, command, 2)).toThrow(
		"your draft is kept",
	);
	expect(
		sameSessionPlan(command, {
			...command,
			body: command.body.trim(),
			notes: command.notes.trim(),
		}),
	).toBe(true);
	expect(sessionPlanRequestPayload(command)).toBe(
		sessionPlanRequestPayload({
			...command,
			requestId: "another-operation",
			revision: 20,
		}),
	);
	expect(sessionPlanRequestPayload(command)).not.toBe(
		sessionPlanRequestPayload({ ...command, partId: "hockey" }),
	);
	expect(sessionPlanRequestPayload(command)).not.toBe(
		sessionPlanRequestPayload({ ...command, body: "Changed" }),
	);
});
test("preview saves and publishes the same flat contract with safe replay and staff checks", (): void => {
	const store = createStore();
	store.set(previewDataAtom, initialAppData);
	store.set(previewAccountIdAtom, primaryAccount.id);
	store.set(previewSessionPlansAtom, {});
	const draft = {
		...command,
		media: command.media,
	};
	store.set(previewSessionPlanCommandAtom, draft);
	store.set(previewSessionPlanCommandAtom, draft);
	expect(store.get(previewSessionPlansAtom)[command.eventId]?.revision).toBe(1);
	expect(() =>
		store.set(previewSessionPlanCommandAtom, { ...draft, body: "Changed" }),
	).toThrow("request");
	expect(
		store.get(previewSharedSessionPlansAtom)[command.eventId],
	).toBeUndefined();
	store.set(previewSessionPlanPublicationAtom, publication);
	store.set(previewSessionPlanPublicationAtom, publication);
	const shared = store.get(previewSharedSessionPlansAtom)[command.eventId];
	expect(shared?.body).toBe(command.body.trim());
	expect(shared).not.toHaveProperty("notes");
	const player = initialAppData.members.find((member) => member.id === "sam");
	expect(player).toBeDefined();
	store.set(previewAccountIdAtom, "taylor");
	expect(() =>
		store.set(previewSessionPlanCommandAtom, {
			...draft,
			requestId: "another-fictional-request",
			revision: 2,
		}),
	).toThrow("Coach");
});

test("inline image bytes follow publication, household and current eligibility", (): void => {
	const event = initialAppData.events.find((entry) => entry.id === "club-thu");
	if (!event) throw new Error("Missing practice fixture.");
	const guardian = {
		...primaryAccount,
		admin: false,
		coachPrograms: [],
		personId: "jamie",
		children: ["sam"],
	};
	const plan = nextSessionPlan(emptySessionPlan(), command, 1);
	const shared = publishSessionPlan(plan, publication, 2);
	expect(
		canReadSessionPlanImage(
			guardian,
			event,
			initialAppData.members,
			plan,
			"uploaded-diagram",
		),
	).toBe(false);
	expect(
		canReadSessionPlanImage(
			guardian,
			event,
			initialAppData.members,
			shared,
			"uploaded-diagram",
		),
	).toBe(true);
	expect(
		canReadSessionPlanImage(
			{ ...guardian, children: [] },
			event,
			initialAppData.members,
			shared,
			"uploaded-diagram",
		),
	).toBe(false);
	expect(
		canReadSessionPlanImage(
			guardian,
			{ ...event, eligiblePersonIds: [] },
			initialAppData.members,
			shared,
			"uploaded-diagram",
		),
	).toBe(false);
	expect(
		canReadSessionPlanImage(
			guardian,
			{ ...event, cancelled: true },
			initialAppData.members,
			shared,
			"uploaded-diagram",
		),
	).toBe(false);
	expect(
		canReadSessionPlanImage(
			guardian,
			event,
			initialAppData.members,
			shared,
			"guessed-file",
		),
	).toBe(false);
	expect(
		canReadSessionPlanImage(
			primaryAccount,
			event,
			initialAppData.members,
			plan,
			"uploaded-diagram",
		),
	).toBe(true);
	expect(
		planBodyBlocks(command).map((block) => block.image?.id ?? block.text),
	).toEqual([
		" Warm up together.",
		"diagram",
		"\n\nPlay three on two.",
		"pool",
		" ",
	]);
	expect(
		validateSessionPlan({
			...command,
			body: `${command.body}[[plan-image:diagram]]`,
		}),
	).toContain("once");
	expect(
		validateSessionPlan({
			...command,
			body: `${command.body}[[plan-image:guessed]]`,
		}),
	).toContain("once");
});
