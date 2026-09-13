import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
type Fixture = { client: ConvexHttpClient; email: string; password: string };
const fixtures: Fixture[] = [];
const fixture = async (name: string): Promise<Fixture> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const email = `participants-${crypto.randomUUID()}@example.test`;
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: { flow: "signUp", name, email, password },
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	const fixture = { client, email, password };
	fixtures.push(fixture);
	return fixture;
};
const paginationOpts = { numItems: 20, cursor: null };
try {
	const owner = await fixture("Participant sender");
	await owner.client.mutation(api.club.create, {
		name: "Participant fixture",
		samples: true,
	});
	const taylor = await fixture("Taylor participant");
	const casey = await fixture("Casey participant");
	const stranger = await fixture("Other club participant");
	await stranger.client.mutation(api.club.create, {
		name: "Other participant fixture",
		samples: false,
	});
	const direct = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: "person:taylor",
	});
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "private-history",
			threadId: direct,
			body: "Private isolated fixture history",
			time: "Now",
		},
	});
	const group = await owner.client.mutation(api.thread_participants.add, {
		threadId: direct,
		recipientIds: ["person:casey"],
		groupId: "fixture-group",
	});
	assert.notEqual(group, direct);
	assert.equal(
		(
			await owner.client.query(api.messaging.list, {
				threadId: group,
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		(
			await owner.client.query(api.thread_participants.current, {
				threadId: group,
			})
		).members.length,
		3,
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "group-history",
			threadId: group,
			body: "Shared isolated fixture history",
			time: "Now",
		},
	});
	await assert.rejects(
		stranger.client.query(api.thread_participants.current, { threadId: group }),
	);
	await assert.rejects(
		stranger.client.mutation(api.thread_participants.add, {
			threadId: group,
			recipientIds: ["person:alex"],
			groupId: "unauthorized",
		}),
	);
	for (const [recipient, personId] of [
		[taylor, "taylor"],
		[casey, "casey"],
	] as const) {
		const invite = await owner.client.mutation(api.invites.create, {
			email: recipient.email,
			profile: { personId },
		});
		await recipient.client.mutation(api.invites.accept, {
			invite,
			revision: 1,
		});
		assert.equal(
			(
				await recipient.client.query(api.messaging.list, {
					threadId: group,
					paginationOpts,
				})
			).page.at(0)?.id,
			"group-history",
		);
	}
	assert.equal(
		(
			await casey.client.query(api.messaging.list, {
				threadId: direct,
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		(
			await taylor.client.query(api.messaging.list, {
				threadId: direct,
				paginationOpts,
			})
		).page.at(0)?.id,
		"private-history",
	);
	const expanded = await taylor.client.mutation(api.thread_participants.add, {
		threadId: group,
		recipientIds: ["person:robin"],
		groupId: "unused",
	});
	assert.equal(expanded, group);
	const robin = await fixture("Robin participant");
	const robinInvite = await owner.client.mutation(api.invites.create, {
		email: robin.email,
		profile: { personId: "robin" },
	});
	await robin.client.mutation(api.invites.accept, {
		invite: robinInvite,
		revision: 1,
	});
	assert.equal(
		(
			await robin.client.query(api.messaging.list, {
				threadId: group,
				paginationOpts,
			})
		).page.at(0)?.id,
		"group-history",
	);
	await assert.rejects(
		owner.client.mutation(api.thread_participants.add, {
			threadId: "club",
			recipientIds: ["person:morgan"],
			groupId: "invalid-general",
		}),
	);
	const caseyId = (await casey.client.query(api.club.current, {}))?.account.id;
	assert(caseyId);
	await taylor.client.mutation(api.moderation.block, {
		targetId: caseyId,
		blocked: true,
	});
	const otherDirect = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: "person:sam",
	});
	await assert.rejects(
		owner.client.mutation(api.thread_participants.add, {
			threadId: otherDirect,
			recipientIds: ["person:taylor", "person:casey"],
			groupId: "blocked-pair",
		}),
	);
	console.log(
		"Participant checks passed: compact directory data, DM creates distinct group without history exposure, pending group members claim independently, group additions share group history, General auto-membership, authorization, pairwise block enforcement. Only disposable fixture messages used.",
	);
} finally {
	for (const fixture of fixtures.toReversed())
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
		});
}
