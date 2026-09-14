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
	const email = `pending-chat-${crypto.randomUUID()}@example.test`;
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
	const owner = await fixture("Pending chat sender");
	const clubId = await owner.client.mutation(api.club.create, {
		name: "Pending chat isolated fixture",
		samples: true,
	});
	const recipient = await fixture("Pending chat recipient");
	const stranger = await fixture("Pending chat outsider");
	await stranger.client.mutation(api.club.create, {
		name: "Other pending chat fixture",
		samples: false,
	});
	const threadId = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: "person:taylor",
	});
	assert.equal(
		await owner.client.mutation(api.messaging.openDirect, {
			recipientId: "person:taylor",
		}),
		threadId,
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "pending-history",
			threadId,
			body: "Isolated fixture message for pending member history",
			time: "Now",
		},
	});
	assert.equal(
		(
			await recipient.client.query(api.messaging.list, {
				threadId,
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		(
			await stranger.client.query(api.messaging.list, {
				threadId,
				paginationOpts,
			})
		).page.length,
		0,
	);
	await assert.rejects(
		stranger.client.mutation(api.club.apply, {
			action: {
				type: "send-message",
				id: "invalid",
				threadId,
				body: "Not authorized",
				time: "Now",
			},
		}),
	);
	const inviteId = await owner.client.mutation(api.invites.create, {
		email: recipient.email,
		profile: { personId: "taylor" },
	});
	await assert.rejects(
		stranger.client.mutation(api.invites.accept, {
			invite: inviteId,
			revision: 1,
		}),
	);
	await recipient.client.mutation(api.invites.accept, {
		invite: inviteId,
		revision: 1,
	});
	const history = await recipient.client.query(api.messaging.list, {
		threadId,
		paginationOpts,
	});
	assert.equal(history.page.at(0)?.id, "pending-history");
	const inbox = await recipient.client.query(api.messaging.inbox, {});
	assert.equal(inbox.find((thread) => thread.id === threadId)?.unread, 1);
	assert.equal(
		await owner.client.mutation(api.messaging.openDirect, {
			recipientId: "person:taylor",
		}),
		threadId,
	);
	assert.equal(
		(await owner.client.query(api.messaging.inbox, {})).find(
			(thread) => thread.id === threadId,
		)?.title,
		"Taylor Brooks",
	);
	assert.equal(
		await recipient.client.mutation(api.messaging.openDirect, {
			recipientId: "person:alex",
		}),
		threadId,
	);
	assert.equal(
		await owner.client.mutation(api.messaging.openDirect, {
			recipientId: "person:taylor",
		}),
		threadId,
	);
	const ownerId = (await owner.client.query(api.club.current, {}))?.account.id;
	assert(ownerId);
	await recipient.client.mutation(api.moderation.block, {
		targetId: ownerId,
		blocked: true,
	});
	await assert.rejects(
		owner.client.mutation(api.messaging.openDirect, {
			recipientId: "person:taylor",
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "send-message",
				id: "blocked",
				threadId,
				body: "Blocked fixture send",
				time: "Now",
			},
		}),
	);
	await recipient.client.mutation(api.moderation.block, {
		targetId: ownerId,
		blocked: false,
	});
	const approvalThread = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: "person:casey",
	});
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "approval-history",
			threadId: approvalThread,
			body: "Isolated approval fixture",
			time: "Now",
		},
	});
	const approved = await fixture("Approved pending member");
	await approved.client.mutation(api.club.requestToJoin, { clubCode: clubId });
	const request = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.requests.at(0);
	assert(request);
	await owner.client.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "casey",
		children: [],
		coachPrograms: [],
		admin: false,
	});
	assert.equal(
		(
			await approved.client.query(api.messaging.list, {
				threadId: approvalThread,
				paginationOpts,
			})
		).page.at(0)?.id,
		"approval-history",
	);
	const householdThread = await owner.client.mutation(
		api.messaging.openDirect,
		{ recipientId: "person:sam" },
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "household-history",
			threadId: householdThread,
			body: "Isolated household claim fixture",
			time: "Now",
		},
	});
	const currentOwner = (await owner.client.query(api.club.current, {}))
		?.account;
	assert(currentOwner);
	await owner.client.mutation(api.club.setAccess, {
		accountId: currentOwner.id,
		children: currentOwner.children,
		coachPrograms: currentOwner.coachPrograms,
		admin: currentOwner.admin,
	});
	assert.equal(
		(
			await recipient.client.query(api.messaging.list, {
				threadId: householdThread,
				paginationOpts,
			})
		).page.length,
		0,
	);
	const recipientAccount = (await recipient.client.query(api.club.current, {}))
		?.account;
	assert(recipientAccount);
	await owner.client.mutation(api.club.setAccess, {
		accountId: recipientAccount.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	assert.equal(
		(
			await recipient.client.query(api.messaging.list, {
				threadId: householdThread,
				paginationOpts,
			})
		).page.at(0)?.id,
		"household-history",
	);
	console.log(
		"Pending messaging passed: roster recipient, stable thread, isolated history retained on verified invitation and admin approval, preclaim/outsider denial, unread history, member title, blocking after claim, household claim and sender re-link preservation. Only isolated fixture messages created.",
	);
} finally {
	for (const fixture of fixtures.toReversed())
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
		});
}
