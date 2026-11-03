import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { profileInput } from "../src/domain/member-profile";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("household");
try {
	const owner = await run.fixture("Household administrator");
	await owner.client.mutation(api.club.create, {
		name: "Household verification",
		samples: false,
	});
	const code = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(code);
	const join = async (name: string): Promise<VerificationFixture> => {
		const fixture = await run.fixture(name);
		await fixture.client.mutation(api.club.requestToJoin, { clubCode: code });
		return fixture;
	};
	const parent = await join("Household parent");
	const recipient = await join("Invited guardian");
	const unrelated = await join("Unrelated member");
	const outsider = await run.fixture("Other household club");
	await outsider.client.mutation(api.club.create, {
		name: "Other household club",
		samples: false,
	});
	const parentBefore = (
		await parent.client.query(api.club.current, { screen: "account-settings" })
	)?.account;
	const recipientBefore = (await recipient.client.query(api.club.current, {}))
		?.account;
	const recipientIdentity = await recipient.client.query(
		api.account.current,
		{},
	);
	assert(parentBefore && recipientBefore && recipientIdentity);
	const create = { name: "Fictional dependent", key: crypto.randomUUID() };
	const ids = await Promise.all([
		parent.client.mutation(api.household.create, create),
		parent.client.mutation(api.household.create, create),
	]);
	const personId = ids.at(0);
	assert(personId);
	assert(ids.every((id) => id === personId));
	await assert.rejects(
		parent.client.mutation(api.household.create, {
			...create,
			name: "Changed replay",
		}),
	);
	await assert.rejects(
		parent.client.mutation(api.household.create, {
			name: " ",
			key: crypto.randomUUID(),
		}),
	);
	const workspace = await parent.client.query(api.club.current, {
		screen: "account-settings",
	});
	assert(workspace);
	const dependent = workspace.data.members.find(
		(person) => person.id === personId,
	);
	assert(dependent);
	assert.deepEqual(dependent.programs, []);
	assert.equal(dependent.registration, "missing");
	assert.equal(dependent.rating, 0);
	assert.equal(workspace.account.admin, parentBefore.admin);
	assert.deepEqual(workspace.account.coachPrograms, parentBefore.coachPrograms);
	assert(workspace.account.children.includes(personId));
	const profile = await parent.client.query(api.member_profiles.read, {
		personId,
	});
	await parent.client.mutation(api.member_profiles.save, {
		...profileInput(profile),
		personId,
		revision: profile.revision,
		expectedName: profile.name,
		email: recipientIdentity.email,
		phone: "+1 403 555 0100",
		capNumber: "8",
		key: crypto.randomUUID(),
	});
	assert.equal(
		(await recipient.client.query(api.member_profiles.read, { personId }))
			.contact,
		undefined,
		"Matching editable contact email must not grant household access",
	);
	assert.equal(
		(await recipient.client.query(api.household.state, {})).available.length,
		0,
	);
	for (const actor of [recipient, unrelated, outsider]) {
		await assert.rejects(
			actor.client.mutation(api.household.accept, { id: personId }),
		);
		await assert.rejects(
			actor.client.mutation(api.household.setDefault, { personId }),
		);
		await assert.rejects(
			actor.client.mutation(api.household.unlink, { personId }),
		);
	}
	await assert.rejects(
		new ConvexHttpClient("http://127.0.0.1:3210", { logger: false }).query(
			api.household.state,
			{},
		),
	);
	await assert.rejects(
		parent.client.mutation(api.household.invite, {
			personId,
			accountId: recipientBefore.id,
			key: crypto.randomUUID(),
		}),
	);
	await parent.client.mutation(api.household.setDefault, { personId });
	assert.equal(
		(await parent.client.query(api.household.state, {})).defaultPersonId,
		personId,
	);
	assert.equal(
		(
			await parent.client.query(api.club.current, {
				screen: "account-settings",
			})
		)?.account.defaultPersonId,
		personId,
	);
	await parent.client.mutation(api.household.unlink, { personId });
	const unlinked = await parent.client.query(api.household.state, {});
	assert.equal(unlinked.defaultPersonId, parentBefore.personId);
	assert(!unlinked.profiles.some((person) => person.id === personId));
	const previous = unlinked.available.find(
		(person) => person.personId === personId,
	);
	assert(previous);
	assert.equal(
		(await parent.client.query(api.member_profiles.read, { personId })).contact,
		undefined,
	);
	assert(
		(
			await owner.client.query(api.pages.members, {
				search: "Fictional",
				archived: false,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.some((row) => row.member.id === personId),
	);
	await assert.rejects(
		recipient.client.mutation(api.household.accept, { id: previous.id }),
	);
	await parent.client.mutation(api.household.accept, { id: previous.id });
	await parent.client.mutation(api.household.accept, { id: previous.id });
	assert.equal(
		(await parent.client.query(api.member_profiles.read, { personId })).contact
			?.phone,
		"+1 403 555 0100",
	);
	await assert.rejects(
		parent.client.mutation(api.household.unlink, {
			personId: parentBefore.personId,
		}),
	);
	const legacy = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			"local_household_checks:seedLegacyProofs",
			JSON.stringify({
				clubId: workspace.clubId,
				ownerId: (await owner.client.query(api.club.current, {}))?.account.id,
				userId: parentBefore.id,
				personId,
			}),
			"--typecheck",
			"disable",
		],
		{ env: process.env, stdout: "pipe", stderr: "pipe" },
	);
	const [legacyOutput, legacyError, legacyCode] = await Promise.all([
		new Response(legacy.stdout).text(),
		new Response(legacy.stderr).text(),
		legacy.exited,
	]);
	assert.equal(legacyCode, 0, legacyError);
	const legacyId: string = JSON.parse(legacyOutput.trim());
	await owner.client.mutation(api.club.setAccess, {
		accountId: parentBefore.id,
		admin: false,
		coachPrograms: [],
		children: [],
	});
	await assert.rejects(
		parent.client.mutation(api.household.accept, { id: previous.id }),
	);
	await assert.rejects(
		parent.client.mutation(api.household.accept, { id: legacyId }),
		"Administrator revocation must cover proofs beyond the old 101-row window",
	);
	assert.equal(
		await parent.client.mutation(api.household.create, create),
		personId,
	);
	assert(
		!(await parent.client.query(api.household.state, {})).profiles.some(
			(person) => person.id === personId,
		),
		"A successful creation replay must not undo administrator revocation",
	);
	const invitation = {
		personId,
		accountId: recipientBefore.id,
		key: crypto.randomUUID(),
	};
	await Promise.all([
		owner.client.mutation(api.household.invite, invitation),
		owner.client.mutation(api.household.invite, invitation),
	]);
	const proof = (
		await recipient.client.query(api.household.state, {})
	).available.find((person) => person.personId === personId);
	assert(proof?.origin === "administrator");
	await assert.rejects(
		unrelated.client.mutation(api.household.accept, { id: proof.id }),
	);
	await assert.rejects(
		outsider.client.mutation(api.household.accept, { id: proof.id }),
	);
	await assert.rejects(
		outsider.client.mutation(api.household.invite, invitation),
	);
	await recipient.client.mutation(api.household.accept, { id: proof.id });
	await owner.client.mutation(api.household.invite, invitation);
	assert.equal(
		(await recipient.client.query(api.member_profiles.read, { personId }))
			.contact?.email,
		recipientIdentity.email,
	);
	const recipientAfter = (await recipient.client.query(api.club.current, {}))
		?.account;
	assert.equal(recipientAfter?.admin, recipientBefore.admin);
	assert.deepEqual(
		recipientAfter?.coachPrograms,
		recipientBefore.coachPrograms,
	);
	assert.equal(recipientAfter?.personId, recipientBefore.personId);
	await recipient.client.mutation(api.household.setDefault, { personId });
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	await assert.rejects(
		recipient.client.mutation(api.household.setDefault, { personId }),
	);
	assert.equal(
		(await recipient.client.query(api.household.state, {})).defaultPersonId,
		recipientBefore.personId,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: false },
	});
	await recipient.client.mutation(api.household.unlink, { personId });
	const relink = (
		await recipient.client.query(api.household.state, {})
	).available.find((person) => person.personId === personId);
	assert(relink);
	await recipient.client.mutation(api.household.dismiss, { id: relink.id });
	await assert.rejects(
		recipient.client.mutation(api.household.accept, { id: relink.id }),
	);
	await owner.client.mutation(api.household.invite, {
		...invitation,
		key: crypto.randomUUID(),
	});
	const latest = (
		await recipient.client.query(api.household.state, {})
	).available.find((person) => person.personId === personId);
	assert(latest);
	await owner.client.mutation(api.club.setAccess, {
		accountId: recipientBefore.id,
		admin: false,
		coachPrograms: [],
		children: [],
	});
	await assert.rejects(
		recipient.client.mutation(api.household.accept, { id: latest.id }),
	);
	console.log(
		"Household verification passed: fresh dependent ownership, no email-based claiming, named targeted proofs, role preservation, concurrent replay, persistent default, unlink/relink, revocation and private-contact boundaries.",
	);
} finally {
	await run.close();
}
