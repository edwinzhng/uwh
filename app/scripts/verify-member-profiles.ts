import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
	type MemberProfile,
	memberProfileLimits,
	profileInput,
} from "../src/domain/member-profile";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("member-profiles");
const site = "http://127.0.0.1:3211";
const png = new Blob(
	[
		Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2N3sAAAAASUVORK5CYII=",
			"base64",
		),
	],
	{ type: "image/png" },
);
const photoRequest = (
	fixture: VerificationFixture | undefined,
	params: Record<string, string>,
	body?: Blob,
): Promise<Response> =>
	fetch(`${site}/profiles/photo?${new URLSearchParams(params)}`, {
		method: body ? "POST" : "GET",
		body,
		headers: {
			...(fixture ? { Authorization: `Bearer ${fixture.token}` } : {}),
			...(body ? { "Content-Type": body.type } : {}),
		},
	});

const verify = async (): Promise<void> => {
	const owner = await run.fixture("Profile owner");
	await owner.client.mutation(api.club.create, {
		name: "Profile verification",
		samples: true,
	});
	const inviteCode = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(inviteCode);
	const join = async (
		name: string,
		admin = false,
	): Promise<VerificationFixture> => {
		const fixture = await run.fixture(name);
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: inviteCode,
		});
		const account = await fixture.client.query(api.account.current, {});
		assert(account);
		await owner.client.mutation(api.club.setAccess, {
			accountId: account.id,
			children: [],
			coachPrograms: [],
			admin,
		});
		return fixture;
	};
	const self = await join("Profile player");
	const guardian = await join("Profile guardian");
	const admin = await join("Profile unrelated administrator", true);
	const outsider = await run.fixture("Profile other club");
	await outsider.client.mutation(api.club.create, {
		name: "Other profile club",
		samples: true,
	});
	const personId = (await self.client.query(api.club.current, {}))?.account
		.personId;
	const guardianAccount = await guardian.client.query(api.account.current, {});
	assert(personId && guardianAccount);
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	const { rating, ratingKnown, positions, ageGroup, revision } =
		await owner.client.query(api.player_coaching.profile, { personId });
	await owner.client.mutation(api.player_coaching.save, {
		personId,
		rating,
		ratingKnown,
		positions,
		ageGroup,
		revision,
		gender: "female",
	});
	for (const client of [self.client, guardian.client]) {
		const profile: MemberProfile = await client.query(
			api.member_profiles.read,
			{ personId },
		);
		assert.equal(profile.competitionGender, undefined);
	}
	const capAssignment = {
		personId,
		capNumber: "12",
		revision: 0,
		key: crypto.randomUUID(),
	};
	await owner.client.mutation(api.member_profiles.saveCapNumber, capAssignment);
	await owner.client.mutation(api.member_profiles.saveCapNumber, capAssignment);
	const initial = await self.client.query(api.member_profiles.read, {
		personId,
	});
	const draft = {
		...profileInput(initial),
		personId,
		expectedName: initial.name,
		revision: initial.revision,
		key: crypto.randomUUID(),
		name: "Profile Player Updated",
		capNumber: "12",
		email: "Player@Example.test",
		phone: "+1 (403) 555-0100",
	};
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	for (const client of [anonymous, outsider.client])
		await assert.rejects(client.query(api.member_profiles.read, { personId }));
	for (const client of [
		anonymous,
		outsider.client,
		self.client,
		guardian.client,
		admin.client,
	])
		await assert.rejects(
			client.mutation(api.member_profiles.saveCapNumber, {
				...capAssignment,
				revision: initial.revision,
				key: crypto.randomUUID(),
				capNumber: "13",
			}),
		);
	for (const client of [self.client, guardian.client])
		for (const capNumber of ["13", ""])
			await assert.rejects(
				client.mutation(api.member_profiles.save, {
					...draft,
					capNumber,
					key: crypto.randomUUID(),
				}),
			);
	for (const client of [owner.client, admin.client, outsider.client])
		await assert.rejects(client.mutation(api.member_profiles.save, draft));
	for (const capNumber of ["0", "100", "2.5", "8junk"])
		await assert.rejects(
			self.client.mutation(api.member_profiles.save, { ...draft, capNumber }),
		);
	await assert.rejects(
		self.client.mutation(api.member_profiles.save, { ...draft, phone: "123" }),
	);
	await assert.rejects(
		self.client.mutation(api.member_profiles.save, {
			...draft,
			email: "invalid",
		}),
	);
	await Promise.all([
		self.client.mutation(api.member_profiles.save, draft),
		self.client.mutation(api.member_profiles.save, draft),
	]);
	const saved = await guardian.client.query(api.member_profiles.read, {
		personId,
	});
	assert.equal(saved.revision, initial.revision + 1);
	assert.equal(saved.contact?.email, "player@example.test");
	assert.equal(saved.capNumber, 12);
	assert.equal(
		(await self.client.query(api.account.current, {}))?.name,
		draft.name,
	);
	assert.notEqual(
		(await self.client.query(api.account.current, {}))?.email,
		saved.contact?.email,
	);
	for (const client of [owner.client, admin.client]) {
		const publicProfile: MemberProfile = await client.query(
			api.member_profiles.read,
			{ personId },
		);
		assert.equal(publicProfile.contact, undefined);
		assert.equal(publicProfile.capNumber, 12);
		assert.equal(publicProfile.canEdit, false);
	}
	await assert.rejects(
		self.client.mutation(api.member_profiles.save, {
			...draft,
			phone: "4035550111",
		}),
	);
	await assert.rejects(
		self.client.mutation(api.member_profiles.save, {
			...draft,
			key: crypto.randomUUID(),
		}),
	);
	const photoKey = crypto.randomUUID();
	assert.equal(
		(await photoRequest(undefined, { person: personId, key: photoKey }, png))
			.status,
		401,
	);
	assert.equal(
		(await photoRequest(admin, { person: personId, key: photoKey }, png))
			.status,
		403,
	);
	assert.equal(
		(
			await photoRequest(
				self,
				{ person: personId, key: photoKey },
				new Blob(["not-an-image"], { type: "image/png" }),
			)
		).status,
		415,
	);
	const oversized = await photoRequest(
		self,
		{ person: personId, key: photoKey },
		new Blob([new Uint8Array(memberProfileLimits.photoBytes + 1)], {
			type: "image/png",
		}),
	);
	assert.equal(oversized.status, 413, await oversized.text());
	const upload = await photoRequest(
		self,
		{ person: personId, key: photoKey },
		png,
	);
	assert.equal(upload.status, 200);
	const uploaded: { id: string } = await upload.json();
	const replay: { id: string } = await (
		await photoRequest(self, { person: personId, key: photoKey }, png)
	).json();
	assert.equal(replay.id, uploaded.id);
	assert.equal((await photoRequest(self, { id: uploaded.id })).status, 200);
	for (const other of [undefined, guardian, admin, outsider])
		assert.equal(
			(await photoRequest(other, { id: uploaded.id })).status,
			other ? 404 : 401,
		);
	await assert.rejects(
		guardian.client.mutation(api.member_profiles.save, {
			...draft,
			...profileInput(saved),
			expectedName: saved.name,
			revision: saved.revision,
			key: crypto.randomUUID(),
			photoId: uploaded.id,
		}),
	);
	const attach = {
		...draft,
		...profileInput(saved),
		expectedName: saved.name,
		revision: saved.revision,
		key: crypto.randomUUID(),
		photoId: uploaded.id,
	};
	await self.client.mutation(api.member_profiles.save, attach);
	const avatar = (
		await admin.client.query(api.member_profiles.avatars, {})
	).find((entry) => entry.personId === personId);
	assert.equal(avatar?.photoId, uploaded.id);
	assert.deepEqual(Object.keys(avatar ?? {}).sort(), [
		"name",
		"personId",
		"photoId",
	]);
	assert.equal(
		(await outsider.client.query(api.member_profiles.avatars, {})).some(
			(entry) => entry.personId === personId,
		),
		false,
	);
	const readable = await photoRequest(admin, { id: uploaded.id });
	assert.equal(readable.status, 200);
	assert.equal(readable.headers.get("Cache-Control"), "private, no-store");
	assert.deepEqual(
		new Uint8Array(await readable.arrayBuffer()),
		new Uint8Array(await png.arrayBuffer()),
	);
	await assert.rejects(
		self.client.mutation(api.member_profile_photos.remove, {
			photoId: uploaded.id,
		}),
	);
	const current = await guardian.client.query(api.member_profiles.read, {
		personId,
	});
	await guardian.client.mutation(api.member_profiles.save, {
		...profileInput(current),
		personId,
		name: "Guardian Updated Name",
		expectedName: current.name,
		revision: current.revision,
		key: crypto.randomUUID(),
		email: "",
		phone: "",
		capNumber: current.capNumber?.toString() ?? "",
		photoId: undefined,
	});
	assert.equal((await photoRequest(admin, { id: uploaded.id })).status, 404);
	assert.equal(
		(await admin.client.query(api.member_profiles.avatars, {})).find(
			(entry) => entry.personId === personId,
		)?.photoId,
		undefined,
	);
	const cleared = await self.client.query(api.member_profiles.read, {
		personId,
	});
	assert.deepEqual(cleared.contact, { email: "", phone: "" });
	assert.equal(cleared.capNumber, 12);
	await assert.rejects(
		admin.client.mutation(api.member_profiles.saveCapNumber, {
			personId,
			revision: cleared.revision,
			key: crypto.randomUUID(),
			capNumber: "",
		}),
	);
	await owner.client.mutation(api.member_profiles.saveCapNumber, {
		personId,
		revision: cleared.revision,
		key: crypto.randomUUID(),
		capNumber: "",
	});
	const capCleared = await self.client.query(api.member_profiles.read, {
		personId,
	});
	assert.equal(capCleared.capNumber, undefined);
	assert.deepEqual(capCleared.contact, cleared.contact);
	assert.equal(
		(await self.client.query(api.account.current, {}))?.name,
		"Guardian Updated Name",
	);
	const pendingUpload = await photoRequest(
		guardian,
		{ person: personId, key: crypto.randomUUID() },
		png,
	);
	assert.equal(pendingUpload.status, 200);
	const pending: { id: string } = await pendingUpload.json();
	await owner.client.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert.equal((await photoRequest(guardian, { id: pending.id })).status, 404);
	assert.equal(
		(await guardian.client.query(api.member_profiles.read, { personId }))
			.contact,
		undefined,
	);
	await assert.rejects(
		guardian.client.mutation(api.member_profiles.save, {
			...profileInput(cleared),
			personId,
			expectedName: cleared.name,
			revision: cleared.revision,
			key: crypto.randomUUID(),
		}),
	);
	await guardian.client.mutation(api.member_profile_photos.remove, {
		photoId: pending.id,
	});
	const deletionUpload = await photoRequest(
		self,
		{ person: personId, key: crypto.randomUUID() },
		png,
	);
	assert.equal(deletionUpload.status, 200);
	const deletionPhoto: { id: string } = await deletionUpload.json();
	await self.client.mutation(api.member_profiles.save, {
		...profileInput(capCleared),
		personId,
		expectedName: capCleared.name,
		revision: capCleared.revision,
		key: crypto.randomUUID(),
		photoId: deletionPhoto.id,
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	await assert.rejects(
		self.client.mutation(api.member_profiles.save, {
			...draft,
			key: crypto.randomUUID(),
		}),
	);
	await run.dispose(self);
	assert.equal(
		(await photoRequest(admin, { id: deletionPhoto.id })).status,
		404,
	);
	await assert.rejects(
		admin.client.query(api.member_profiles.read, { personId }),
	);
	console.log(
		"Member profile checks passed: self/guardian edits, private contacts, range validation, replay/revisions, account-name sync without sign-in changes, authenticated photo bytes, pending/revoked access, replacement/removal, archive protection and account erasure.",
	);
};

const result = (await Promise.allSettled([verify()])).at(0);
const cleanup = (await Promise.allSettled([run.close()])).at(0);
if (result?.status === "rejected") throw result.reason;
if (cleanup?.status === "rejected") throw cleanup.reason;
