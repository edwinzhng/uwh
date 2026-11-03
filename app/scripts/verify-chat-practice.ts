import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import { programRoomId } from "../src/domain/managed-rooms";
import { createVerificationRun } from "./verification-fixtures";

const verification = createVerificationRun("chat-practice");
try {
	const fixture = await verification.fixture("Chat review coach");
	const client = fixture.client;
	await client.mutation(api.club.create, {
		name: "Chat verification",
		samples: true,
	});
	const workspace = await client.query(api.club.current, {
		screen: "schedule",
	});
	assert(workspace);
	const now = Date.now();
	const today = clubDate(now, "America/Edmonton");
	const threadId = programRoomId("club");
	await client.mutation(api.messaging.ensureGeneral, {});
	assert.equal(
		await client.query(api.chat_practice.next, { threadId, now }),
		null,
	);
	await client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "chat-next",
			draft: {
				title: "Evening practice",
				date: addDays(today, 1),
				start: "19:00",
				end: "20:30",
				venue: "MNP Centre, 2225 Macleod Trail SE, Calgary",
				program: "club",
				kind: "hockey",
				repeat: "once",
				seasonId: "2026-2027",
				description: "Isolated chat verification",
				signupOpens: "now",
			},
		},
	});
	const next = await client.query(api.chat_practice.next, { threadId, now });
	assert.equal(next?.event.id, "chat-next-0");
	assert.equal(next?.attending, 0);
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "chat-next-0",
			personId: workspace.account.personId,
			response: "going",
		},
	});
	assert.equal(
		(await client.query(api.chat_practice.next, { threadId, now }))?.attending,
		1,
	);
	assert.equal(
		await client.query(api.chat_practice.next, { threadId: "club", now }),
		null,
	);
	assert.equal(
		await client.query(api.chat_practice.next, {
			threadId: programRoomId("unknown"),
			now,
		}),
		null,
	);
	const outsider = await verification.fixture("Other club member");
	await outsider.client.mutation(api.club.create, {
		name: "Other club",
		samples: true,
	});
	assert.equal(
		await outsider.client.query(api.chat_practice.next, { threadId, now }),
		null,
	);
	for (const [id, body] of [
		["chat-review-1", "See you poolside tomorrow. Bring both caps."],
		["chat-review-2", "I’ll be there — thanks for the reminder!"],
	] as const) {
		await client.mutation(api.club.apply, {
			action: {
				type: "send-message",
				id,
				threadId,
				body,
				time: new Date().toISOString(),
			},
		});
	}
	await client.mutation(api.club.apply, {
		action: {
			type: "set-reaction",
			messageId: "chat-review-1",
			emoji: "👍",
			active: true,
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "set-reaction",
			messageId: "chat-review-1",
			emoji: "🐊",
			active: true,
		},
	});
	console.log(
		"Program practice selection, live attendance count and cross-club isolation verified.",
	);
	if (process.env.UI_REVIEW === "true") {
		const account = await client.query(api.account.current, {});
		assert(account);
		await Bun.write(
			"/tmp/uwh-chat-review-login.json",
			JSON.stringify({
				email: account.email,
				password: fixture.password,
				threadId,
			}),
		);
		console.log("Isolated chat UI fixture ready");
		const deadline = Date.now() + 900000;
		while (
			!(await Bun.file("/tmp/uwh-chat-review-stop").exists()) &&
			Date.now() < deadline
		)
			await Bun.sleep(500);
		await Bun.file("/tmp/uwh-chat-review-login.json").delete();
	}
} finally {
	await verification.close();
}
