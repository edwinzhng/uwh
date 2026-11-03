import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import type { MessageImage } from "../src/domain/messaging";
import {
	createVerificationRun,
	type VerificationFixture,
} from "./verification-fixtures";

const run = createVerificationRun("chat-appearance");
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
const load = (fixture: VerificationFixture, id: string): Promise<Response> =>
	fetch(`${site}/images?id=${encodeURIComponent(id)}`, {
		headers: { Authorization: `Bearer ${fixture.token}` },
	});
const upload = async (
	fixture: VerificationFixture,
	thread: string,
): Promise<MessageImage> => {
	const response = await fetch(
		`${site}/images?${new URLSearchParams({ thread, name: "Chat picture" })}`,
		{
			method: "POST",
			body: png,
			headers: {
				Authorization: `Bearer ${fixture.token}`,
				"Content-Type": "image/png",
			},
		},
	);
	assert.equal(response.status, 200, await response.clone().text());
	return response.json();
};

const verify = async (): Promise<void> => {
	const owner = await run.fixture("Picture owner");
	await owner.client.mutation(api.club.create, {
		name: "Chat picture verification",
		samples: true,
	});
	const code = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(code);
	const member = await run.fixture("Picture participant");
	await member.client.mutation(api.club.requestToJoin, { clubCode: code });
	const memberId = (await member.client.query(api.account.current, {}))?.id;
	assert(memberId);
	const outsider = await run.fixture("Other club");
	await outsider.client.mutation(api.club.create, {
		name: "Other picture club",
		samples: false,
	});
	const threadId = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: memberId,
	});
	await owner.client.mutation(api.chat_appearance.save, {
		threadId,
		icon: "trophy",
	});
	await owner.client.mutation(api.chat_appearance.save, {
		threadId,
		icon: "trophy",
	});
	await assert.rejects(
		member.client.mutation(api.chat_appearance.save, {
			threadId,
			icon: "star",
		}),
	);
	await assert.rejects(
		outsider.client.mutation(api.chat_appearance.save, {
			threadId,
			icon: "star",
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.chat_appearance.save, {
			threadId,
			icon: "unsupported",
			expectedIcon: "trophy",
		}),
	);
	await owner.client.mutation(api.messaging.ensureGeneral, {});
	await assert.rejects(
		member.client.mutation(api.chat_appearance.save, {
			threadId: "club",
			icon: "star",
		}),
	);
	const otherThreadPhoto = await upload(owner, "club");
	await assert.rejects(
		owner.client.mutation(api.chat_appearance.save, {
			threadId,
			imageId: otherThreadPhoto.id,
			expectedIcon: "trophy",
		}),
	);
	await owner.client.mutation(api.images.remove, {
		imageId: otherThreadPhoto.id,
	});
	const image = await upload(owner, threadId);
	await assert.rejects(
		member.client.mutation(api.chat_appearance.save, {
			threadId,
			imageId: image.id,
			expectedIcon: "trophy",
		}),
	);
	await owner.client.mutation(api.chat_appearance.save, {
		threadId,
		imageId: image.id,
		expectedIcon: "trophy",
	});
	await owner.client.mutation(api.chat_appearance.save, {
		threadId,
		imageId: image.id,
		expectedIcon: "trophy",
	});
	assert.equal((await load(member, image.id)).status, 200);
	assert.equal((await load(outsider, image.id)).status, 404);
	assert.equal(
		(await member.client.query(api.messaging.inbox, {})).find(
			(entry) => entry.id === threadId,
		)?.avatarImageId,
		image.id,
	);
	await assert.rejects(
		owner.client.mutation(api.images.remove, { imageId: image.id }),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "send-message",
				id: crypto.randomUUID(),
				threadId,
				body: "",
				time: "Now",
				images: [image],
			},
		}),
	);
	await member.client.mutation(api.chat_appearance.save, {
		threadId,
		icon: "star",
		expectedImageId: image.id,
	});
	assert.equal((await load(owner, image.id)).status, 404);
	const replacement = await upload(member, threadId);
	await member.client.mutation(api.chat_appearance.save, {
		threadId,
		imageId: replacement.id,
		expectedIcon: "star",
	});
	await run.dispose(member);
	assert.equal((await load(owner, replacement.id)).status, 404);
	assert.equal(
		(await owner.client.query(api.messaging.inbox, {})).find(
			(entry) => entry.id === threadId,
		)?.avatarImageId,
		undefined,
	);
	console.log(
		"Chat picture checks passed: persistence, replay, edit conflicts, participant/staff permissions, private photo access, ownership, thread isolation, replacement, attachment safety and account erasure.",
	);
};

await verify().finally(run.close);
