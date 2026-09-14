import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppData } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";

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
	const saved = reduceApp(initialAppData, primaryAccount, {
		type: "save-feedback",
		feedback: { ...feedback, visibility: "private" },
	});
	for (const visibility of ["draft", "published"] as const)
		expect(() =>
			reduceApp(saved, primaryAccount, {
				type: "save-feedback",
				feedback: { ...feedback, visibility },
			}),
		).toThrow("Keep private notes private");
});
