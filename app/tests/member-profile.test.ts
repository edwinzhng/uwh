import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	previewMemberProfiles,
	previewProfilePhotos,
	savePreviewMemberCapNumber,
	savePreviewMemberProfile,
	uploadPreviewProfilePhoto,
} from "../src/demo/member-profile-state";
import type { Account, Member } from "../src/domain/app-types";
import {
	canEditMemberProfile,
	type MemberProfileInput,
	memberProfileError,
	memberProfileProjection,
	normalizeMemberProfile,
} from "../src/domain/member-profile";
import {
	defaultPhotoCrop,
	movePhotoCrop,
	photoCropRectangle,
} from "../src/domain/photo-crop";

const input: MemberProfileInput = {
	name: " Alex Updated ",
	email: " ALEX@example.test ",
	phone: "+1 (403) 555-0123",
	capNumber: "99",
};
const person: Member = {
	id: "player",
	name: "Player",
	programs: ["club"],
	position: "Forward",
	rating: 50,
	registration: "approved",
	goal: "Keep space",
	steps: 2,
};
const account: Account = {
	id: "parent",
	personId: "parent",
	name: "Parent",
	children: ["player"],
	coachPrograms: [],
	admin: false,
};

test("profile fields support clearable contacts and strict cap/email/phone validation", (): void => {
	expect(memberProfileError(input)).toBeUndefined();
	expect(normalizeMemberProfile(input)).toEqual({
		name: "Alex Updated",
		email: "alex@example.test",
		phone: "+1 (403) 555-0123",
		capNumber: 99,
		photoId: undefined,
	});
	for (const capNumber of ["0", "100", "1.5", "1junk", "-1"])
		expect(memberProfileError({ ...input, capNumber })).toBeDefined();
	for (const phone of ["123", "call me", "1234567890123456"])
		expect(memberProfileError({ ...input, phone })).toBeDefined();
	expect(memberProfileError({ ...input, name: " " })).toBeDefined();
	expect(memberProfileError({ ...input, email: "not-an-email" })).toBeDefined();
	expect(
		normalizeMemberProfile({ ...input, capNumber: "", email: "", phone: "" })
			.capNumber,
	).toBeUndefined();
});

test("only self and linked guardians edit, with contacts redacted from staff and unrelated members", (): void => {
	const fields = {
		email: "private@example.test",
		birthDate: "1993-04-15",
		competitionGender: "female" as const,
		phone: "+1 403 555 0100",
		capNumber: 7,
		photoId: "photo",
		revision: 2,
	};
	expect(canEditMemberProfile(account, person)).toBe(true);
	expect(memberProfileProjection(account, person, fields).birthDate).toBe(
		"1993-04-15",
	);
	expect(memberProfileProjection(account, person, fields).contact).toEqual({
		email: fields.email,
		phone: fields.phone,
	});
	for (const staff of [
		{ ...account, children: [], admin: true },
		{ ...account, children: [], coachPrograms: ["club"] },
	]) {
		const projection = memberProfileProjection(staff, person, fields);
		expect(projection.canEdit).toBe(false);
		expect(projection.contact).toBeUndefined();
		expect(projection.birthDate).toBe(
			staff.coachPrograms.includes("club") ? "1993-04-15" : undefined,
		);
		expect(projection.competitionGender).toBe(
			staff.coachPrograms.includes("club") ? "female" : undefined,
		);
		expect(projection.capNumber).toBe(7);
		expect(projection.photoId).toBe("photo");
	}
	expect(canEditMemberProfile(account, { ...person, archived: true })).toBe(
		false,
	);
});

test("crop rectangles stay square and in bounds for portrait, landscape, zoom and edge positions", (): void => {
	for (const source of [
		{ width: 600, height: 1000 },
		{ width: 1200, height: 400 },
		{ width: 1, height: 1 },
	])
		for (const crop of [
			defaultPhotoCrop,
			{ x: 0, y: 1, zoom: 3 },
			{ x: -5, y: 5, zoom: 20 },
		]) {
			const rectangle = photoCropRectangle(source, crop);
			expect(rectangle.width).toBe(rectangle.height);
			expect(rectangle.originX).toBeGreaterThanOrEqual(0);
			expect(rectangle.originY).toBeGreaterThanOrEqual(0);
			expect(rectangle.originX + rectangle.width).toBeLessThanOrEqual(
				source.width,
			);
			expect(rectangle.originY + rectangle.height).toBeLessThanOrEqual(
				source.height,
			);
		}
	expect(() =>
		photoCropRectangle({ width: 0, height: 10 }, defaultPhotoCrop),
	).toThrow();
	expect(() =>
		photoCropRectangle(
			{ width: 10, height: 10 },
			{ ...defaultPhotoCrop, zoom: Number.NaN },
		),
	).toThrow();
	const moved = movePhotoCrop(
		{ width: 600, height: 1000 },
		defaultPhotoCrop,
		1000,
		-1000,
		300,
	);
	expect(moved.x).toBe(0.5);
	expect(moved.y).toBe(1);
});

test("preview edits preserve roster fields, replay exactly once and reject stale or switched-account saves", (): void => {
	const store = createStore();
	const before = store
		.get(previewDataAtom)
		.members.find((member) => member.id === "alex");
	if (!before) throw new Error("Fixture unavailable");
	const draft = {
		...input,
		personId: "alex",
		actorId: "alex",
		revision: 0,
		expectedName: before.name,
		key: "profile-preview-first-key",
	};
	store.set(savePreviewMemberProfile, draft);
	store.set(savePreviewMemberProfile, draft);
	expect(store.get(previewMemberProfiles).alex?.revision).toBe(1);
	expect(
		store.get(previewDataAtom).members.find((member) => member.id === "alex"),
	).toEqual({ ...before, name: "Alex Updated" });
	expect(() =>
		store.set(savePreviewMemberProfile, { ...draft, phone: "4035550124" }),
	).toThrow("save key");
	expect(() =>
		store.set(savePreviewMemberProfile, {
			...draft,
			key: "profile-preview-second-key",
		}),
	).toThrow("another session");
	store.set(previewAccountIdAtom, "taylor");
	expect(() =>
		store.set(savePreviewMemberProfile, {
			...draft,
			key: "profile-preview-third-key",
		}),
	).toThrow("household");
});

test("preview photos are actor/person bound with idempotent upload and bounded pending drafts", (): void => {
	const store = createStore();
	const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const blob = new Blob([bytes], { type: "image/png" });
	const upload = {
		actorId: "alex",
		personId: "alex",
		blob,
		bytes,
		digest: "fixture-digest",
		key: "profile-photo-first-key",
	};
	const id = store.set(uploadPreviewProfilePhoto, upload);
	expect(store.set(uploadPreviewProfilePhoto, upload)).toBe(id);
	expect(store.get(previewProfilePhotos)).toHaveLength(1);
	expect(() =>
		store.set(uploadPreviewProfilePhoto, { ...upload, digest: "changed" }),
	).toThrow("key");
	const sam = store
		.get(previewDataAtom)
		.members.find((member) => member.id === "sam");
	if (!sam) throw new Error("Fixture unavailable");
	store.set(previewAccountIdAtom, "jamie");
	expect(() =>
		store.set(savePreviewMemberProfile, {
			...input,
			name: sam.name,
			expectedName: sam.name,
			personId: "sam",
			revision: 0,
			actorId: "jamie",
			key: "profile-preview-wrong-photo",
			capNumber:
				store.get(previewMemberProfiles)[sam.id]?.capNumber?.toString() ?? "",
			photoId: id,
		}),
	).toThrow("Photo unavailable");
	store.set(previewAccountIdAtom, "alex");
	for (const index of [1, 2, 3])
		store.set(uploadPreviewProfilePhoto, {
			...upload,
			key: `profile-photo-extra-${index}`,
		});
	expect(() =>
		store.set(uploadPreviewProfilePhoto, {
			...upload,
			key: "profile-photo-exceeds-limit",
		}),
	).toThrow("pending");
});

test("canonical profile edits retain a shared photo still referenced by a preserved merged alias", (): void => {
	const store = createStore();
	const data = store.get(previewDataAtom);
	const current = data.members.find((member) => member.id === "alex");
	if (!current) throw new Error("Fixture unavailable.");
	const photoId = "preserved-alias-photo";
	store.set(previewDataAtom, {
		...data,
		members: [
			...data.members,
			{
				...current,
				id: "archived-photo-source",
				archived: true,
				mergedInto: current.id,
			},
		],
	});
	const record = {
		email: "",
		phone: "",
		photoId,
		revision: 0,
		lastKey: "",
		lastActorId: "",
		lastPayload: "",
	};
	store.set(previewMemberProfiles, {
		alex: record,
		"archived-photo-source": record,
	});
	store.set(previewProfilePhotos, [
		{
			id: photoId,
			personId: "archived-photo-source",
			ownerId: "alex",
			key: "original-photo-key",
			blob: new Blob(["fictional photo bytes"]),
			digest: "original-digest",
			attached: true,
		},
	]);
	const save = {
		personId: current.id,
		actorId: "alex",
		name: current.name,
		expectedName: current.name,
		revision: 0,
		key: "canonical-photo-save-12345",
		email: "",
		phone: "",
		capNumber: "",
		photoId,
	};
	store.set(savePreviewMemberProfile, save);
	expect(store.get(previewMemberProfiles).alex?.revision).toBe(1);
	store.set(savePreviewMemberProfile, {
		...save,
		revision: 1,
		key: "canonical-photo-remove-12345",
		photoId: undefined,
	});
	expect(store.get(previewMemberProfiles).alex?.photoId).toBeUndefined();
	expect(
		store.get(previewMemberProfiles)["archived-photo-source"]?.photoId,
	).toBe(photoId);
	expect(store.get(previewProfilePhotos).map((photo) => photo.id)).toContain(
		photoId,
	);
});

test("coaches update player competition details without changing private contacts and reject stale or unauthorized edits", (): void => {
	const store = createStore();
	const before = store.get(previewMemberProfiles).sam;
	const draft = {
		personId: "sam",
		actorId: "alex",
		capNumber: "14",
		birthDate: "2010-04-01",
		competitionGender: "female" as const,
		revision: 0,
		key: "coach-details-first-key",
	};
	store.set(savePreviewMemberCapNumber, draft);
	store.set(savePreviewMemberCapNumber, draft);
	const saved = store.get(previewMemberProfiles).sam;
	expect(saved?.birthDate).toBe("2010-04-01");
	expect(saved?.competitionGender).toBe("female");
	expect(saved?.capNumber).toBe(14);
	expect(saved?.phone).toBe(before?.phone);
	expect(saved?.revision).toBe(1);
	expect(() =>
		store.set(savePreviewMemberCapNumber, {
			...draft,
			key: "coach-details-stale-key",
		}),
	).toThrow("another session");
	store.set(previewAccountIdAtom, "taylor");
	expect(() =>
		store.set(savePreviewMemberCapNumber, {
			...draft,
			actorId: "taylor",
			revision: 1,
			key: "coach-details-denied-key",
		}),
	).toThrow("coaches");
});

test("households can save ordered position preferences but cannot alter coach-set caps", (): void => {
	const store = createStore();
	store.set(previewAccountIdAtom, "taylor");
	const player = store
		.get(previewDataAtom)
		.members.find((entry) => entry.id === "sam");
	if (!player) throw new Error("Fixture unavailable");
	const base = {
		personId: player.id,
		actorId: "taylor",
		name: player.name,
		expectedName: player.name,
		email: "",
		phone: "",
		capNumber: "7",
		revision: 0,
		key: "preference-order-first-save",
		positionPreferences: ["GOALIE", "CENTER", "FORWARD"] as (
			| "GOALIE"
			| "CENTER"
			| "FORWARD"
		)[],
	};
	expect(() =>
		store.set(savePreviewMemberProfile, { ...base, capNumber: "8" }),
	).toThrow("coaches");
	store.set(savePreviewMemberProfile, base);
	expect(store.get(previewMemberProfiles).sam?.positionPreferences).toEqual([
		"GOALIE",
		"CENTER",
		"FORWARD",
	]);
	expect(
		memberProfileProjection(
			{ ...account, children: [] },
			player,
			store.get(previewMemberProfiles).sam,
		).positionPreferences,
	).toEqual(["GOALIE", "CENTER", "FORWARD"]);
	store.set(previewAccountIdAtom, "alex");
	store.set(savePreviewMemberCapNumber, {
		personId: "sam",
		actorId: "alex",
		capNumber: "9",
		revision: 1,
		key: "coach-cap-after-preferences",
	});
	expect(store.get(previewMemberProfiles).sam?.positionPreferences).toEqual([
		"GOALIE",
		"CENTER",
		"FORWARD",
	]);
	expect(
		memberProfileError({ ...input, positionPreferences: ["CENTER", "CENTER"] }),
	).toBeDefined();
});
