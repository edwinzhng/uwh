import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { previewAccountIdAtom, previewDataAtom } from "../src/demo/app-state";
import {
	previewMemberProfiles,
	previewProfilePhotos,
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
		phone: "+1 403 555 0100",
		capNumber: 7,
		photoId: "photo",
		revision: 2,
	};
	expect(canEditMemberProfile(account, person)).toBe(true);
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
	expect(() =>
		store.set(savePreviewMemberProfile, {
			...input,
			name: sam.name,
			expectedName: sam.name,
			personId: "sam",
			revision: 0,
			actorId: "alex",
			key: "profile-preview-wrong-photo",
			photoId: id,
		}),
	).toThrow("Photo unavailable");
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
