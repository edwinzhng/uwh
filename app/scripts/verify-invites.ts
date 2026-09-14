import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { localRun } from "./local-checks";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
type Fixture = { client: ConvexHttpClient; email: string; password: string };
const fixtures: Fixture[] = [];
const fixture = async (
	name: string,
	email = `invites-${crypto.randomUUID()}@example.test`,
): Promise<Fixture> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: { flow: "signUp", email, password, name },
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	const value = { client, email, password };
	fixtures.push(value);
	return value;
};
const captured = async (
	client: ConvexHttpClient,
	id: Id<"clubInvites">,
): Promise<string> => {
	for (const _attempt of Array.from({ length: 40 })) {
		const result = await client.query(api.invites.list, {
			paginationOpts: { numItems: 50, cursor: null },
		});
		const invite = result.page.find((entry) => entry.id === id);
		if (invite?.delivery !== "queued") {
			assert.equal(invite?.delivery, "local");
			assert(invite);
			return invite.url;
		}
		await Bun.sleep(100);
	}
	throw new Error("Local invitation was not captured.");
};
try {
	const owner = await fixture("Invite owner");
	const clubId = await owner.client.mutation(api.club.create, {
		name: "Invitation test club",
		samples: true,
	});
	const outsider = await fixture("Other club admin");
	await outsider.client.mutation(api.club.create, {
		name: "Other invitation club",
		samples: false,
	});
	const email = `invites-player-${crypto.randomUUID()}@example.test`;
	const profile = {
		id: crypto.randomUUID(),
		name: "Invited player",
		player: true,
		charge: 16000,
	};
	const [id, duplicate] = await Promise.all([
		owner.client.mutation(api.invites.create, { email, profile }),
		owner.client.mutation(api.invites.create, {
			email: ` ${email.toUpperCase()} `,
			profile,
		}),
	]);
	assert.equal(id, duplicate);
	const link = await captured(owner.client, id);
	await localRun("invite_delivery:finish", internal.invite_delivery.finish, {
		id,
		revision: 1,
		delivery: "failed",
	});
	assert.equal(await captured(owner.client, id), link);
	assert.equal(new URL(link).pathname, "/join");
	assert.equal(new URL(link).searchParams.get("invite"), id);
	const capturedMail = await localRun(
		"local_email:latest",
		internal.local_email.latest,
		{ email },
	);
	assert.equal(capturedMail, link);
	const publicClient = new ConvexHttpClient(url, { logger: false });
	const details = await publicClient.query(api.invites.preview, {
		invite: id,
		revision: 1,
	});
	assert.equal(details?.clubName, "Invitation test club");
	assert.equal(Object.hasOwn(details ?? {}, "email"), false);
	await assert.rejects(
		publicClient.mutation(api.invites.accept, { invite: id, revision: 1 }),
	);
	await assert.rejects(
		publicClient.query(api.invites.list, {
			paginationOpts: { numItems: 50, cursor: null },
		}),
	);
	await assert.rejects(outsider.client.mutation(api.invites.revoke, { id }));
	await assert.rejects(outsider.client.mutation(api.invites.resend, { id }));
	await assert.rejects(
		outsider.client.mutation(api.invites.accept, { invite: id, revision: 1 }),
		/email address/,
	);
	await assert.rejects(
		owner.client.mutation(api.invites.resend, { id }),
		/Wait a minute/,
	);
	const recipient = await fixture("Recipient", email);
	await assert.rejects(
		recipient.client.mutation(api.invites.create, {
			email: "not-admin@example.test",
			profile: { personId: "jamie" },
		}),
	);
	const accepted = await Promise.all([
		recipient.client.mutation(api.invites.accept, { invite: id, revision: 1 }),
		recipient.client.mutation(api.invites.accept, { invite: id, revision: 1 }),
	]);
	assert.deepEqual(accepted, [clubId, clubId]);
	const workspace = await recipient.client.query(api.club.current, {});
	assert.equal(workspace?.account.personId, profile.id);
	assert.equal(workspace?.account.admin, false);
	assert.deepEqual(workspace?.account.coachPrograms, []);
	assert.deepEqual(workspace?.account.children, []);
	assert(workspace?.data.conversations.some((thread) => thread.id === "club"));
	assert.equal(
		workspace?.data.members.filter((member) => member.id === profile.id).length,
		1,
	);
	assert.equal(
		workspace?.data.charges.find((charge) => charge.personId === profile.id)
			?.amount,
		16000,
	);
	await assert.rejects(
		recipient.client.query(api.invites.list, {
			paginationOpts: { numItems: 30, cursor: null },
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.invites.create, {
			email,
			profile: { personId: "jamie" },
		}),
		/already belongs/,
	);
	const secondEmail = `invites-existing-${crypto.randomUUID()}@example.test`;
	const second = await owner.client.mutation(api.invites.create, {
		email: secondEmail,
		profile: { personId: "jamie" },
	});
	await captured(owner.client, second);
	const secondRecipient = await fixture(
		"Existing profile recipient",
		secondEmail,
	);
	await localRun("local_invites:age", internal.local_invites.age, {
		id: second,
		expire: true,
	});
	await assert.rejects(
		secondRecipient.client.mutation(api.invites.accept, {
			invite: second,
			revision: 1,
		}),
		/no longer available/,
	);
	await owner.client.mutation(api.invites.resend, { id: second });
	await captured(owner.client, second);
	assert.equal(
		(
			await publicClient.query(api.invites.preview, {
				invite: second,
				revision: 1,
			})
		)?.state,
		"replaced",
	);
	await assert.rejects(
		secondRecipient.client.mutation(api.invites.accept, {
			invite: second,
			revision: 1,
		}),
	);
	await owner.client.mutation(api.invites.revoke, { id: second });
	await assert.rejects(
		secondRecipient.client.mutation(api.invites.accept, {
			invite: second,
			revision: 2,
		}),
	);
	await localRun("local_invites:age", internal.local_invites.age, {
		id: second,
		expire: false,
	});
	const replacement = await owner.client.mutation(api.invites.create, {
		email: secondEmail,
		profile: { personId: "jamie" },
	});
	await captured(owner.client, replacement);
	await secondRecipient.client.mutation(api.invites.accept, {
		invite: replacement,
		revision: 1,
	});
	assert.equal(
		(await secondRecipient.client.query(api.club.current, {}))?.account
			.personId,
		"jamie",
	);
	const before = await owner.client.query(api.club.current, {});
	await assert.rejects(
		owner.client.mutation(api.invites.create, {
			email: "not-an-email",
			profile: { ...profile, id: "must-not-create" },
		}),
	);
	const after = await owner.client.query(api.club.current, {});
	assert.equal(after?.data.members.length, before?.data.members.length);
	console.log(
		"Invitation checks passed: capture, verified signup, club/profile binding, role restrictions, concurrent acceptance, expiry, resend, revocation and invalid-input rollback.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
