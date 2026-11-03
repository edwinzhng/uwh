import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	previewMemberProfiles,
	savePreviewMemberCapNumber,
	savePreviewMemberProfile,
} from "../src/demo/member-profile-state";
import { canEditMemberCapNumber } from "../src/domain/member-profile";

const scope = { archived: false, programs: ["club"] };
test("only scoped coaching staff can edit active cap numbers", (): void => {
	expect(
		canEditMemberCapNumber({ admin: false, coachPrograms: [] }, scope),
	).toBe(false);
	expect(
		canEditMemberCapNumber({ admin: false, coachPrograms: ["youth"] }, scope),
	).toBe(false);
	expect(
		canEditMemberCapNumber({ admin: false, coachPrograms: ["club"] }, scope),
	).toBe(true);
	expect(
		canEditMemberCapNumber({ admin: true, coachPrograms: [] }, scope),
	).toBe(false);
	expect(
		canEditMemberCapNumber({ admin: true, coachPrograms: ["club"] }, scope),
	).toBe(true);
	expect(
		canEditMemberCapNumber({ admin: true, coachPrograms: ["youth"] }, scope),
	).toBe(false);
	expect(
		canEditMemberCapNumber(
			{ admin: true, coachPrograms: [] },
			{ ...scope, archived: true },
		),
	).toBe(false);
	expect(
		canEditMemberCapNumber(
			{ admin: true, coachPrograms: [] },
			{ ...scope, mergedInto: "canonical" },
		),
	).toBe(false);
});

test("guardians preserve assigned caps while changing private profile details, and cannot set or clear them", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "jamie");
	const person = store
		.get(previewDataAtom)
		.members.find((member) => member.id === "sam");
	if (!person) throw new Error("Missing fixture");
	const draft = {
		personId: person.id,
		actorId: "jamie",
		name: "Sam Updated",
		expectedName: person.name,
		revision: 0,
		key: "guardian-normal-profile-save",
		capNumber: "7",
		email: "new@example.test",
		phone: "",
	};
	store.set(savePreviewMemberProfile, draft);
	expect(store.get(previewMemberProfiles).sam?.capNumber).toBe(7);
	expect(store.get(previewMemberProfiles).sam?.email).toBe("new@example.test");
	for (const capNumber of ["9", ""])
		expect(() =>
			store.set(savePreviewMemberProfile, {
				...draft,
				expectedName: "Sam Updated",
				revision: 1,
				key: `guardian-forbidden-cap-${capNumber || "clear"}`,
				capNumber,
			}),
		).toThrow("coaches");
	expect(() =>
		store.set(savePreviewMemberCapNumber, {
			personId: person.id,
			actorId: "jamie",
			revision: 1,
			key: "guardian-direct-cap-save",
			capNumber: "9",
		}),
	).toThrow("coaches");
	expect(store.get(previewMemberProfiles).sam?.revision).toBe(1);
});

test("cap-only staff saves preserve private fields, reject stale/mismatched writes and replay once", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "casey");
	const previous = store.get(previewMemberProfiles).sam;
	const draft = {
		personId: "sam",
		actorId: "casey",
		revision: 0,
		key: "coach-cap-number-save-01",
		capNumber: "23",
	};
	store.set(savePreviewMemberCapNumber, draft);
	store.set(savePreviewMemberCapNumber, draft);
	const saved = store.get(previewMemberProfiles).sam;
	expect(saved?.revision).toBe(1);
	expect(saved?.capNumber).toBe(23);
	expect(saved?.email).toBe(previous?.email);
	expect(saved?.phone).toBe(previous?.phone);
	expect(saved?.photoId).toBe(previous?.photoId);
	expect(() =>
		store.set(savePreviewMemberCapNumber, { ...draft, capNumber: "24" }),
	).toThrow("save key");
	expect(() =>
		store.set(savePreviewMemberCapNumber, {
			...draft,
			key: "coach-cap-number-stale",
		}),
	).toThrow("another session");
	store.set(previewAccountIdAtom, "jamie");
	expect(() =>
		store.set(savePreviewMemberCapNumber, {
			...draft,
			revision: 1,
			key: "switched-account-cap-key",
		}),
	).toThrow("coaches");
});

test("cap-only writes cannot cross coaching program scope or bypass cap validation", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "casey");
	const draft = {
		personId: "sam",
		actorId: "casey",
		revision: 0,
		key: "coach-cap-invalid-number",
		capNumber: "100",
	};
	expect(() => store.set(savePreviewMemberCapNumber, draft)).toThrow("1–99");
	store.set(previewDataAtom, (data) => ({
		...data,
		members: data.members.map((person) =>
			person.id === "sam" ? { ...person, programs: ["youth"] } : person,
		),
	}));
	expect(() =>
		store.set(savePreviewMemberCapNumber, { ...draft, capNumber: "8" }),
	).toThrow("coaches");
	expect(store.get(previewMemberProfiles).sam?.capNumber).toBe(7);
});

test("administration alone cannot set or clear a cap through the direct preview command", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "morgan");
	const before = store.get(previewMemberProfiles).sam;
	for (const capNumber of ["18", ""])
		expect(() =>
			store.set(savePreviewMemberCapNumber, {
				personId: "sam",
				actorId: "morgan",
				revision: before?.revision ?? 0,
				key: `admin-only-cap-forbidden-${capNumber || "clear"}`,
				capNumber,
			}),
		).toThrow("coaches");
	expect(store.get(previewMemberProfiles).sam).toEqual(before);
});
