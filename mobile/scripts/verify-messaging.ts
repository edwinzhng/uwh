import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { AppAction } from "../src/domain/app-types";
import type { MessageImage } from "../src/domain/messaging";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("Use the isolated local backend only.");
const site = "http://127.0.0.1:3211";
const runId = crypto.randomUUID();
const signUp = async (
	name: string,
): Promise<{ client: ConvexHttpClient; token: string }> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			name,
			email: `photo-${name}-${runId}@example.test`,
			password: `${crypto.randomUUID()}Aa1!`,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	return { client, token: result.tokens.token };
};
const owner = await signUp("owner");
const clubId = await owner.client.mutation(api.club.create, {
	name: `Photos ${runId.slice(0, 8)}`,
	samples: true,
});
const parent = await signUp("parent");
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
const stranger = await signUp("stranger");
await stranger.client.mutation(api.club.create, {
	name: "Other club",
	samples: true,
});
const png = new Blob(
	[
		Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9X8AAAAASUVORK5CYII=",
			"base64",
		),
	],
	{ type: "image/png" },
);
const upload = (
	token: string,
	blob: Blob,
	thread = "youth",
): Promise<Response> =>
	fetch(`${site}/images?${new URLSearchParams({ thread, name: "Test.png" })}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": blob.type },
		body: blob,
	});
const load = (id: string, token?: string): Promise<Response> =>
	fetch(`${site}/images?id=${encodeURIComponent(id)}`, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
const uploaded = await upload(owner.token, png);
assert.equal(uploaded.status, 200, await uploaded.clone().text());
const photo: MessageImage = await uploaded.json();
assert.equal((await load(photo.id)).status, 401);
assert.equal((await load(photo.id, parent.token)).status, 404);
assert.equal((await load(photo.id, stranger.token)).status, 404);
assert.equal((await load(photo.id, owner.token)).status, 200);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "stolen",
			threadId: "youth",
			body: "",
			time: "Now",
			images: [photo],
		},
	}),
);
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "wrong-thread",
			threadId: "club",
			body: "",
			time: "Now",
			images: [photo],
		},
	}),
);
const send: AppAction = {
	type: "send-message",
	id: "photo-message",
	threadId: "youth",
	body: "",
	time: "Now",
	images: [photo],
};
await owner.client.mutation(api.club.apply, { action: send });
await owner.client.mutation(api.club.apply, { action: send });
const received = await parent.client.query(api.messaging.list, {
	threadId: "youth",
	paginationOpts: { numItems: 40, cursor: null },
});
assert(received);
assert.equal(
	received.page.filter((message) => message.id === send.id).length,
	1,
);
assert.equal(
	received.page.find((message) => message.id === send.id)?.accountId,
	workspace.account.id,
);
const downloaded = await load(photo.id, parent.token);
assert.equal(downloaded.status, 200);
assert.equal(downloaded.headers.get("Cache-Control"), "no-store");
assert.deepEqual(await downloaded.arrayBuffer(), await png.arrayBuffer());
await assert.rejects(
	owner.client.mutation(api.images.remove, { imageId: photo.id }),
);
const react: AppAction = {
	type: "set-reaction",
	messageId: send.id,
	emoji: "👍",
	active: true,
};
await parent.client.mutation(api.club.apply, { action: react });
await parent.client.mutation(api.club.apply, { action: react });
await owner.client.mutation(api.club.apply, { action: react });
const reacted = await parent.client.query(api.messaging.message, {
	messageId: send.id,
});
assert.equal(reacted?.reactions?.at(0)?.accountIds.length, 2);
await parent.client.mutation(api.club.apply, {
	action: { ...react, active: false },
});
assert.equal(
	(
		await parent.client.query(api.messaging.message, { messageId: send.id })
	)?.reactions?.at(0)?.accountIds.length,
	1,
);
assert.equal(
	(await upload(owner.token, new Blob(["<svg/>"], { type: "image/png" })))
		.status,
	415,
);
const oversized = await upload(
	owner.token,
	new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" }),
);
assert.equal(oversized.status, 413, await oversized.text());
assert.equal((await upload(parent.token, png, "casey")).status, 403);
const temporary: MessageImage = await (await upload(owner.token, png)).json();
await owner.client.mutation(api.images.remove, { imageId: temporary.id });
assert.equal((await load(temporary.id, owner.token)).status, 404);
await owner.client.mutation(api.club.setAccess, {
	accountId: family.account.id,
	children: [],
	coachPrograms: [],
	admin: false,
});
assert.equal((await load(photo.id, parent.token)).status, 404);
await assert.rejects(parent.client.mutation(api.club.apply, { action: react }));
assert.equal((await upload(parent.token, png)).status, 403);
assert.equal((await load(photo.id, owner.token)).status, 200);
console.log(
	"Live messaging passed: photo-only send, retry safety, reactions, protected downloads, thread/club isolation, ownership, revocation, removal, MIME and size limits.",
);

await owner.client.mutation(api.club.apply, {
	action: {
		type: "set-reaction",
		messageId: send.id,
		emoji: "🧑🏽‍🚀",
		active: true,
	},
});
await owner.client.mutation(api.club.apply, {
	action: {
		type: "send-message",
		id: "reply",
		threadId: "youth",
		body: "Photo reply",
		time: "Now",
		replyToId: send.id,
	},
});
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "cross-reply",
			threadId: "club",
			body: "Invalid reply",
			time: "Now",
			replyToId: send.id,
		},
	}),
);
await assert.rejects(
	stranger.client.mutation(api.club.apply, {
		action: { type: "edit-message", messageId: send.id, body: "Hijack" },
	}),
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "edit-message",
		messageId: send.id,
		body: "Updated photo caption",
	},
});
const edited = await owner.client.query(api.messaging.message, {
	messageId: send.id,
});
assert.equal(edited?.edited, true);
assert.equal(edited?.body, "Updated photo caption");
assert(edited?.reactions?.some((reaction) => reaction.emoji === "🧑🏽‍🚀"));
await owner.client.mutation(api.club.apply, {
	action: { type: "delete-message", messageId: send.id },
});
await owner.client.mutation(api.club.apply, {
	action: { type: "delete-message", messageId: send.id },
});
assert.equal((await load(photo.id, owner.token)).status, 404);
const deleted = await owner.client.query(api.messaging.message, {
	messageId: send.id,
});
assert.equal(deleted?.deleted, true);
assert.equal(deleted?.images?.length ?? 0, 0);
assert.equal(
	(await owner.client.query(api.messaging.message, { messageId: "reply" }))
		?.replyToId,
	send.id,
);
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: { type: "edit-message", messageId: send.id, body: "Restore" },
	}),
);
console.log(
	"Live message editing passed: arbitrary emoji, replies, thread isolation, ownership, tombstones and attached-photo deletion.",
);
