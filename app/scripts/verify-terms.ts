import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import type { AppAction } from "../src/domain/app-types";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("terms");
try {
	const owner = await run.fixture("Fictional policy administrator");
	await owner.client.mutation(api.club.create, {
		name: "Fictional policy tests",
		samples: false,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club);
	const player = await run.fixture("Fictional policy member");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const playerAccount = (await player.client.query(api.club.current, {}))
		?.account;
	assert(playerAccount);
	await owner.client.action(api.calendar_tokens.enable, {
		personId: club.account.personId,
		includeWaitlisted: false,
	});
	const outsider = await run.fixture("Different policy club");
	await outsider.client.mutation(api.club.create, {
		name: "Other fictional policy club",
		samples: false,
	});
	assert.equal(
		(await player.client.query(api.terms.current, {})).accepted,
		true,
	);
	const draft = {
		version: "test-1",
		title: "Fictional policy",
		body: "Synthetic verification text only. This is not a legal agreement and does not affect a real club.",
		revision: 0,
		key: crypto.randomUUID(),
		confirmed: true,
	};
	await assert.rejects(player.client.mutation(api.terms.publish, draft));
	await assert.rejects(
		owner.client.mutation(api.terms.publish, { ...draft, confirmed: false }),
	);
	const policyId = await owner.client.mutation(api.terms.publish, draft);
	assert.equal(await owner.client.mutation(api.terms.publish, draft), policyId);
	await assert.rejects(
		owner.client.mutation(api.terms.publish, {
			...draft,
			body: "Changed payload",
		}),
	);
	const state = await owner.client.query(api.terms.current, {});
	assert.equal(state.policy?.body, draft.body);
	assert.equal(state.accepted, false);
	const action: AppAction = {
		type: "settings",
		clubName: "Fictional updated name",
		reminders: true,
	};
	await assert.rejects(
		owner.client.mutation(api.club.apply, { action }),
		/Review and accept/,
	);
	await assert.rejects(
		owner.client.mutation(api.club.setAccess, {
			accountId: playerAccount.id,
			children: [],
			coachPrograms: [],
			admin: false,
		}),
		/Review and accept/,
	);
	await assert.rejects(
		owner.client.mutation(api.household.create, {
			name: "Blocked fictional child",
			key: crypto.randomUUID(),
		}),
		/Review and accept/,
	);
	await assert.rejects(
		owner.client.mutation(api.calendar.preferences, {
			personId: club.account.personId,
			includeWaitlisted: true,
		}),
		/Review and accept/,
	);
	await assert.rejects(
		owner.client.action(api.calendar_tokens.enable, {
			personId: club.account.personId,
			includeWaitlisted: false,
		}),
		/Review and accept/,
	);
	const blockedPhoto = await fetch(
		`http://127.0.0.1:3211/profiles/photo?${new URLSearchParams({ person: club.account.personId, key: crypto.randomUUID() })}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${owner.token}`,
				"Content-Type": "image/png",
			},
			body: new Blob(["fictional upload bytes"], { type: "image/png" }),
		},
	);
	assert.equal(blockedPhoto.status, 403);
	const blockedResource = await fetch(
		"http://127.0.0.1:3211/resources/file?purpose=document&name=terms.pdf",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${owner.token}`,
				"Content-Type": "application/pdf",
			},
			body: new Blob(["%PDF-1.4\nfictional fixture"], {
				type: "application/pdf",
			}),
		},
	);
	assert.equal(blockedResource.status, 403);
	await owner.client.mutation(api.calendar.disable, {
		personId: club.account.personId,
	});
	assert(
		(await owner.client.query(api.account.current, {}))?.hasPassword,
		"Account security remains accessible without agreement",
	);
	await assert.rejects(
		player.client.mutation(api.terms.accept, { policyId, confirmed: false }),
	);
	await assert.rejects(
		outsider.client.mutation(api.terms.accept, { policyId, confirmed: true }),
	);
	await player.client.mutation(api.terms.accept, { policyId, confirmed: true });
	const acceptance = await player.client.query(api.terms.current, {});
	await player.client.mutation(api.terms.accept, { policyId, confirmed: true });
	assert.equal(
		(await player.client.query(api.terms.current, {})).acceptedAt,
		acceptance.acceptedAt,
	);
	await owner.client.mutation(api.terms.accept, { policyId, confirmed: true });
	await owner.client.mutation(api.club.apply, { action });
	const second = {
		...draft,
		version: "test-2",
		body: `${draft.body}\nSecond synthetic revision.`,
		revision: 1,
		key: crypto.randomUUID(),
	};
	const nextId = await owner.client.mutation(api.terms.publish, second);
	assert.notEqual(nextId, policyId);
	assert.equal(
		(await player.client.query(api.terms.current, {})).accepted,
		false,
	);
	await assert.rejects(
		player.client.mutation(api.terms.accept, { policyId, confirmed: true }),
	);
	await assert.rejects(
		owner.client.mutation(api.terms.publish, {
			...draft,
			revision: 2,
			key: crypto.randomUUID(),
		}),
		/new version/,
	);
	await assert.rejects(
		player.client.mutation(api.terms.setRequired, {
			required: false,
			revision: 2,
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.terms.setRequired, {
			required: false,
			revision: 1,
		}),
	);
	await run.dispose(player);
	await owner.client.mutation(api.terms.setRequired, {
		required: false,
		revision: 2,
	});
	assert.equal(
		(await owner.client.query(api.terms.current, {})).accepted,
		true,
	);
	await owner.client.mutation(api.terms.setRequired, {
		required: true,
		revision: 3,
	});
	assert.equal(
		(await owner.client.query(api.terms.current, {})).accepted,
		false,
	);
	await owner.client.mutation(api.terms.setRequired, {
		required: false,
		revision: 4,
	});
	assert.equal(
		(await owner.client.query(api.terms.current, {})).accepted,
		true,
		"An administrator can recover from a mistakenly required policy without accepting it",
	);
	console.log(
		"Terms verified: explicit approved publication, immutable versions, current-version acceptance, actor/club scope, idempotent retry, stale rejection and deletion without assent.",
	);
} finally {
	await run.close();
}
