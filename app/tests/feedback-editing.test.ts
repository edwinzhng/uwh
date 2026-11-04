import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppData } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { canReadFeedback, feedbackKind } from "../src/domain/feedback-access";

const feedback: AppData["feedback"][number] = {
	id: "new-feedback",
	personId: "sam",
	authorId: "spoofed",
	date: "2026-09-08",
	body: "Keep scanning.",
	visibility: "published",
};
const parent = {
	...primaryAccount,
	admin: false,
	coachPrograms: [],
	personId: "jamie",
	children: ["sam"],
};

test("feedback can publish directly and retries do not duplicate it", (): void => {
	const action = { type: "save-feedback", feedback } as const;
	const published = reduceApp(initialAppData, primaryAccount, action);
	expect(
		visibleAppData(published, parent).feedback.find(
			(entry) => entry.id === feedback.id,
		)?.authorId,
	).toBe(primaryAccount.id);
	expect(reduceApp(published, primaryAccount, action)).toBe(published);
	expect(() =>
		reduceApp(published, primaryAccount, {
			type: "save-feedback",
			feedback: { ...feedback, body: "Changed" },
		}),
	).toThrow();
});

test("club members can publish shoutouts but cannot create coaching notes", (): void => {
	const published = reduceApp(initialAppData, parent, {
		type: "save-feedback",
		feedback: { ...feedback, kind: "shoutout" },
	});
	expect(
		published.feedback.find((entry) => entry.id === feedback.id)?.authorId,
	).toBe(parent.id);
	expect(() =>
		reduceApp(initialAppData, parent, {
			type: "save-feedback",
			feedback: { ...feedback, visibility: "private" },
		}),
	).toThrow();
	expect(() =>
		reduceApp(initialAppData, parent, {
			type: "save-feedback",
			feedback: { ...feedback, kind: "coaching" },
		}),
	).toThrow();
});

test("players, guardians and coaches can send recognition tied to a specific practice", (): void => {
	const practice = initialAppData.events.find(
		(entry) => entry.id === "club-thu",
	);
	if (!practice) throw new Error("Practice fixture is missing.");
	const player = { ...parent, id: "taylor", personId: "taylor", children: [] };
	for (const actor of [player, parent, primaryAccount]) {
		const action = {
			type: "save-feedback",
			feedback: {
				...feedback,
				kind: "shoutout",
				category: "mvp",
				eventId: practice.id,
				date: practice.date,
			},
		} as const;
		const published = reduceApp(initialAppData, actor, action);
		const saved = published.feedback.find((entry) => entry.id === feedback.id);
		expect(saved).toMatchObject({
			personId: "sam",
			authorId: actor.id,
			eventId: practice.id,
			date: practice.date,
			category: "mvp",
		});
		expect(reduceApp(published, actor, action)).toBe(published);
	}
});

test("legacy published coaching feedback is limited to coaches and its household", (): void => {
	const published = reduceApp(initialAppData, primaryAccount, {
		type: "save-feedback",
		feedback,
	});
	const unrelated = { ...parent, personId: "taylor", children: [] };
	const admin = { ...unrelated, admin: true };
	const player = { ...unrelated, personId: feedback.personId };
	const member = initialAppData.members.find(
		(entry) => entry.id === feedback.personId,
	);
	expect(feedbackKind(feedback)).toBe("coaching");
	expect(canReadFeedback(feedback, parent, member)).toBe(true);
	expect(canReadFeedback(feedback, player, member)).toBe(true);
	expect(canReadFeedback(feedback, primaryAccount, member)).toBe(true);
	expect(canReadFeedback(feedback, unrelated, member)).toBe(false);
	expect(canReadFeedback(feedback, admin, member)).toBe(false);
	for (const account of [unrelated, admin])
		expect(
			visibleAppData(published, account).feedback.some(
				(entry) => entry.id === feedback.id,
			),
		).toBe(false);
	expect(canReadFeedback(feedback, parent, undefined)).toBe(false);
});

test("shoutouts are private to their recipient household without coach or admin overrides", (): void => {
	const published = reduceApp(initialAppData, parent, {
		type: "save-feedback",
		feedback: { ...feedback, kind: "shoutout" },
	});
	const unrelated = { ...parent, personId: "taylor", children: [] };
	expect(
		visibleAppData(published, unrelated).feedback.map((entry) => entry.id),
	).toEqual([]);
	const recipient = initialAppData.members.find(
		(entry) => entry.id === feedback.personId,
	);
	const shoutout = { ...feedback, kind: "shoutout" as const };
	for (const actor of [parent, { ...unrelated, personId: feedback.personId }])
		expect(canReadFeedback(shoutout, actor, recipient)).toBe(true);
	for (const actor of [
		unrelated,
		{ ...unrelated, admin: true },
		{ ...unrelated, coachPrograms: ["club", "youth"] },
	])
		expect(canReadFeedback(shoutout, actor, recipient)).toBe(false);

	expect(() =>
		reduceApp(initialAppData, primaryAccount, {
			type: "save-feedback",
			feedback: { ...feedback, kind: "shoutout", visibility: "draft" },
		}),
	).toThrow("Shoutouts must be sent to the recipient");
});

test("coaching drafts and published records cannot be retyped into public shoutouts", (): void => {
	for (const visibility of ["draft", "published"] as const) {
		const saved = reduceApp(initialAppData, primaryAccount, {
			type: "save-feedback",
			feedback: { ...feedback, visibility },
		});
		expect(() =>
			reduceApp(saved, primaryAccount, {
				type: "save-feedback",
				feedback: { ...feedback, kind: "shoutout" },
			}),
		).toThrow("Keep coaching feedback and shoutouts separate");
	}
});

test("drafts can be edited, published or deleted only by their coach", (): void => {
	const saved = reduceApp(initialAppData, primaryAccount, {
		type: "save-feedback",
		feedback: { ...feedback, visibility: "draft" },
	});
	expect(
		visibleAppData(saved, parent).feedback.some(
			(entry) => entry.id === feedback.id,
		),
	).toBe(false);
	const edited = reduceApp(saved, primaryAccount, {
		type: "save-feedback",
		feedback: { ...feedback, visibility: "draft", body: "Updated draft" },
	});
	expect(edited.feedback.find((entry) => entry.id === feedback.id)?.body).toBe(
		"Updated draft",
	);
	expect(() =>
		reduceApp(
			edited,
			{ ...primaryAccount, id: "other-coach" },
			{ type: "delete-feedback", id: feedback.id },
		),
	).toThrow();
	expect(() =>
		reduceApp(edited, parent, { type: "delete-feedback", id: feedback.id }),
	).toThrow();
	const deleted = reduceApp(edited, primaryAccount, {
		type: "delete-feedback",
		id: feedback.id,
	});
	expect(deleted.feedback.some((entry) => entry.id === feedback.id)).toBe(
		false,
	);
	const published = reduceApp(edited, primaryAccount, {
		type: "save-feedback",
		feedback: { ...feedback, body: "Updated draft" },
	});
	expect(
		visibleAppData(published, parent).feedback.find(
			(entry) => entry.id === feedback.id,
		)?.body,
	).toBe("Updated draft");
	expect(() =>
		reduceApp(published, primaryAccount, {
			type: "delete-feedback",
			id: feedback.id,
		}),
	).toThrow();
});

test("private notes cannot become a draft that leaks to a parent", (): void => {
	const saved: AppData = {
		...initialAppData,
		feedback: [
			...initialAppData.feedback,
			{ ...feedback, authorId: primaryAccount.id, visibility: "private" },
		],
	};
	expect(() =>
		reduceApp(initialAppData, primaryAccount, {
			type: "save-feedback",
			feedback: { ...feedback, visibility: "private" },
		}),
	).toThrow("Save feedback as a draft");
	expect(
		reduceApp(saved, primaryAccount, {
			type: "save-feedback",
			feedback: {
				...feedback,
				visibility: "private",
				body: "Updated private feedback",
			},
		}).feedback.find((entry) => entry.id === feedback.id)?.visibility,
	).toBe("private");
	for (const visibility of ["draft", "published"] as const)
		expect(() =>
			reduceApp(saved, primaryAccount, {
				type: "save-feedback",
				feedback: { ...feedback, visibility },
			}),
		).toThrow("Keep private notes private");
});

test("only admins can remove published shoutouts, including when the caller is the author or recipient", (): void => {
	const published = reduceApp(initialAppData, parent, {
		type: "save-feedback",
		feedback: { ...feedback, kind: "shoutout" },
	});
	const action = { type: "delete-feedback", id: feedback.id } as const;
	const nonAdmins = [
		parent,
		{ ...parent, id: "recipient", personId: feedback.personId },
		{ ...primaryAccount, id: "coach", admin: false },
	];
	for (const actor of nonAdmins) {
		expect(() => reduceApp(published, actor, action)).toThrow();
	}
	expect(
		reduceApp(published, primaryAccount, action).feedback.some(
			(entry) => entry.id === feedback.id,
		),
	).toBe(false);
});

test("shared coach feedback records the actual coach name and never trusts a supplied author label", (): void => {
	const next = reduceApp(initialAppData, primaryAccount, {
		type: "save-feedback",
		feedback: { ...feedback, authorName: "Forged coach" },
	});
	expect(
		next.feedback.find((entry) => entry.id === feedback.id)?.authorName,
	).toBe(primaryAccount.name);
});
