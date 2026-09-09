import assert from "node:assert/strict";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { ThreadMessage } from "../src/domain/messaging";
import { localRun } from "./local-checks";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixture = async (
	name: string,
): Promise<{ client: ConvexHttpClient; token: string }> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			name,
			email: `readiness-${crypto.randomUUID()}@example.test`,
			password: `${crypto.randomUUID()}Aa1!`,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	return { client, token: result.tokens.token };
};
const owner = await fixture("Readiness Owner");
const clubId = await owner.client.mutation(api.club.create, {
	name: "Message readiness",
	samples: true,
});
const parent = await fixture("Readiness Parent");
await parent.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const workspace = await owner.client.query(api.club.current, {});
assert(workspace);
const request = workspace.requests.at(0);
assert(request);
await owner.client.mutation(api.club.approveRequest, {
	requestId: request.id,
	personId: "jamie",
	children: ["sam"],
	coachPrograms: [],
	admin: false,
});
const family = await parent.client.query(api.club.current, {});
assert(family);
const ownerId = workspace.account.id;
const parentId = family.account.id;
const identity = await owner.client.query(api.account.current, {});
assert(identity);
const stranger = await fixture("Readiness Stranger");
await stranger.client.mutation(api.club.create, {
	name: "Other readiness club",
	samples: true,
});

const directIds = await Promise.all([
	owner.client.mutation(api.messaging.openDirect, { recipientId: parentId }),
	parent.client.mutation(api.messaging.openDirect, { recipientId: ownerId }),
]);
const directId = directIds.at(0);
assert(directId);
assert.equal(directId, directIds.at(1));
assert.equal(
	await owner.client.mutation(api.messaging.openDirect, {
		recipientId: parentId,
	}),
	directId,
);
const directs = (await owner.client.query(api.messaging.inbox, {})).filter(
	(thread) => thread.id === directId,
);
assert.equal(directs.length, 1);
assert.equal(directs.at(0)?.title, "Readiness Parent");
assert.equal(
	(await parent.client.query(api.messaging.inbox, {})).find(
		(thread) => thread.id === directId,
	)?.title,
	"Readiness Owner",
);
await localRun(
	"local_checks:removeDirectKey",
	internal.local_checks.removeDirectKey,
	{ clubId, userId: identity.id, threadId: directId },
);
assert.equal(
	await parent.client.mutation(api.messaging.openDirect, {
		recipientId: ownerId,
	}),
	directId,
);
await assert.rejects(
	owner.client.mutation(api.messaging.openDirect, { recipientId: ownerId }),
);
await assert.rejects(
	stranger.client.mutation(api.messaging.openDirect, { recipientId: ownerId }),
);
const send = (
	client: ConvexHttpClient,
	id: string,
	threadId = "club",
	replyToId?: string,
): Promise<string | null> =>
	client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id,
			threadId,
			body: id,
			time: "Now",
			...(replyToId ? { replyToId } : {}),
		},
	});
const page = (
	client: ConvexHttpClient,
	threadId = "club",
	cursor: string | null = null,
): Promise<FunctionReturnType<typeof api.messaging.list>> =>
	client.query(api.messaging.list, {
		threadId,
		paginationOpts: { numItems: 40, cursor },
	});
const unread = async (
	client: ConvexHttpClient,
	threadId = "club",
): Promise<number> =>
	(await client.query(api.messaging.inbox, {})).find(
		(thread) => thread.id === threadId,
	)?.unread ?? 0;
const baseline = await page(parent.client);
assert(baseline.isDone);
await localRun(
	"local_checks:seedMessageHistory",
	internal.local_checks.seedMessageHistory,
	{
		clubId,
		userId: identity.id,
		threadId: "club",
		count: 350,
		prefix: "history",
	},
);
const first = await page(parent.client);
assert.equal(first.page.length, 40);
assert.equal(first.page.at(0)?.id, "history-349");
assert.equal(first.isDone, false);
const pages: ThreadMessage[][] = [first.page];
const remaining = async (cursor: string): Promise<void> => {
	const result = await page(parent.client, "club", cursor);
	pages.push(result.page);
	if (!result.isDone) await remaining(result.continueCursor);
};
await remaining(first.continueCursor);
const history = pages.flat();
assert.equal(history.length, baseline.page.length + 350);
assert.equal(
	new Set(history.map((message) => message.id)).size,
	history.length,
);
assert.equal(
	new Set(history.map((message) => message.createdAt)).size,
	history.length,
);
assert.deepEqual(
	history.map((message) => message.createdAt),
	history.map((message) => message.createdAt).toSorted((a, b) => b - a),
);
assert.equal(await unread(parent.client), 100);
assert.equal(
	(await owner.client.query(api.club.current, {}))?.data.messages.length,
	0,
);
assert.equal((await page(stranger.client, directId)).page.length, 0);
console.log(
	"History pagination and unread checks passed. Waiting for the seeded sender’s rate-limit window.",
);
await Bun.sleep(60000);
await send(owner.client, "private-message", directId);
assert.equal(
	await stranger.client.query(api.messaging.message, {
		messageId: "private-message",
	}),
	null,
);
await assert.rejects(
	parent.client.mutation(api.messaging.markRead, {
		threadId: "club",
		messageId: "private-message",
	}),
);
await assert.rejects(
	stranger.client.mutation(api.messaging.markRead, {
		threadId: directId,
		messageId: "private-message",
	}),
);
await parent.client.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "history-349",
});
assert.equal(await unread(parent.client), 0);
await send(parent.client, "own-message");
assert.equal(await unread(parent.client), 0);
assert.equal(await unread(owner.client), 1);
await send(owner.client, "new-arrival");
await parent.client.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "history-0",
});
assert.equal(await unread(parent.client), 1);
await parent.client.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "new-arrival",
});
assert.equal(await unread(parent.client), 0);
const secondDevice = new ConvexHttpClient(url, { logger: false });
secondDevice.setAuth(parent.token);
assert.equal(await unread(secondDevice), 0);
await send(parent.client, "old-reply", "club", "history-0");
const replied = await page(parent.client);
assert.equal(
	replied.page.find((message) => message.id === "old-reply")?.reply?.body,
	"History 0",
);
assert(!replied.page.some((message) => message.id === "history-0"));
await owner.client.mutation(api.club.apply, {
	action: {
		type: "edit-message",
		messageId: "history-0",
		body: "Edited original",
	},
});
assert.equal(
	(await page(parent.client)).page.find((message) => message.id === "old-reply")
		?.reply?.body,
	"Edited original",
);
await owner.client.mutation(api.club.apply, {
	action: { type: "delete-message", messageId: "history-0" },
});
const deletedReply = (await page(parent.client)).page.find(
	(message) => message.id === "old-reply",
)?.reply;
assert.equal(deletedReply?.deleted, true);
assert.equal(deletedReply?.body, "");
await send(owner.client, "blocked-arrival");
await parent.client.mutation(api.moderation.block, {
	targetId: ownerId,
	blocked: true,
});
assert.equal(await unread(parent.client), 0);
assert(
	(await page(parent.client)).page.every(
		(message) => message.accountId !== ownerId,
	),
);
assert.equal(
	(await page(parent.client)).page.find((message) => message.id === "old-reply")
		?.reply,
	undefined,
);
assert.equal(
	(await parent.client.query(api.messaging.inbox, {})).find(
		(thread) => thread.id === "club",
	)?.latest?.id,
	"old-reply",
);
assert.equal(
	await parent.client.query(api.messaging.message, {
		messageId: "blocked-arrival",
	}),
	null,
);
await assert.rejects(
	parent.client.mutation(api.messaging.openDirect, { recipientId: ownerId }),
);
await assert.rejects(
	parent.client.mutation(api.messaging.markRead, {
		threadId: "club",
		messageId: "blocked-arrival",
	}),
);
await parent.client.mutation(api.moderation.block, {
	targetId: ownerId,
	blocked: false,
});
assert.equal(await unread(parent.client), 1);
await parent.client.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "blocked-arrival",
});

const live = new ConvexClient(url, { logger: false });
live.setAuth(async (): Promise<string> => parent.token);
const ready = Promise.withResolvers<void>();
const changed = Promise.withResolvers<void>();
const updatedPage = Promise.withResolvers<void>();
const stopInbox = live.onUpdate(api.messaging.inbox, {}, (threads): void => {
	ready.resolve();
	if (threads.find((thread) => thread.id === "club")?.unread === 1)
		changed.resolve();
});
const stopPage = live.onUpdate(
	api.messaging.list,
	{ threadId: "club", paginationOpts: { numItems: 40, cursor: null } },
	(result): void => {
		if (result.page.at(0)?.id === "live-arrival") updatedPage.resolve();
	},
);
const timeout = setTimeout((): void => {
	ready.reject(new Error("Subscription timed out"));
	changed.reject(new Error("Unread update timed out"));
	updatedPage.reject(new Error("Page update timed out"));
}, 15000);
await ready.promise;
await send(owner.client, "live-arrival");
await Promise.all([changed.promise, updatedPage.promise]);
clearTimeout(timeout);
stopInbox();
stopPage();
await live.close();
await send(owner.client, "offline-arrival");
const reconnected = new ConvexHttpClient(url, { logger: false });
reconnected.setAuth(parent.token);
assert.equal(await unread(reconnected), 2);
await reconnected.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "offline-arrival",
});
assert.equal(await unread(secondDevice), 0);
await send(owner.client, "revoked-youth", "youth");
await owner.client.mutation(api.club.setAccess, {
	accountId: parentId,
	children: [],
	coachPrograms: [],
	admin: false,
});
assert.equal((await page(parent.client, "youth")).page.length, 0);
assert.equal(
	await parent.client.query(api.messaging.message, {
		messageId: "revoked-youth",
	}),
	null,
);
await assert.rejects(
	parent.client.mutation(api.messaging.markRead, {
		threadId: "youth",
		messageId: "revoked-youth",
	}),
);
console.log(
	"Message readiness passed: 350-message pagination, concurrent and legacy direct reuse, unread/read state across sessions, stale read protection, reactive inbox/history, reconnect, older replies, edits/deletion, blocking and access revocation.",
);
