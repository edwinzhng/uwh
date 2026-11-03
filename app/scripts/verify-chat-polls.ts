import assert from "node:assert/strict";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { pollMessageId } from "../src/domain/chat-polls";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("chat-polls");
try {
	const owner = await run.fixture("Poll coach");
	await owner.client.mutation(api.club.create, {
		name: "Poll verification",
		samples: true,
	});
	const code = (
		await owner.client.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(code);
	const player = await run.fixture("Poll player");
	await player.client.mutation(api.club.requestToJoin, { clubCode: code });
	const outsider = await run.fixture("Outside poll club");
	await outsider.client.mutation(api.club.create, {
		name: "Other poll club",
		samples: false,
	});
	const draft = {
		threadId: "club",
		key: crypto.randomUUID(),
		question: "Which practice focus?",
		options: ["Passing", "Support"],
		multiple: false,
	};
	const pollId = await owner.client.mutation(api.thread_tools.create, draft);
	const anchor = await owner.client.query(api.messaging.message, {
		messageId: pollMessageId(pollId),
	});
	assert(anchor);
	assert.equal(anchor.pollId, pollId);
	assert.equal(anchor.body, draft.question);
	assert.equal(anchor.threadId, draft.threadId);
	assert(anchor.createdAt && Number.isFinite(anchor.createdAt));
	assert.equal(
		(await player.client.query(api.messaging.inbox, {})).find(
			(thread) => thread.id === "club",
		)?.latest?.pollId,
		pollId,
	);
	assert(
		(await player.client.query(api.messaging.inbox, {})).some(
			(thread) => thread.id === "club" && thread.unread > 0,
		),
	);
	await player.client.mutation(api.messaging.markRead, {
		threadId: "club",
		messageId: anchor.id,
	});
	assert.equal(
		(await player.client.query(api.messaging.inbox, {})).find(
			(thread) => thread.id === "club",
		)?.unread,
		0,
	);
	assert.equal(
		await owner.client.mutation(api.thread_tools.create, draft),
		pollId,
	);
	assert.equal(
		(
			await owner.client.query(api.messaging.list, {
				threadId: "club",
				paginationOpts: { cursor: null, numItems: 100 },
			})
		).page.filter((message) => message.pollId === pollId).length,
		1,
	);
	assert.equal(
		await player.client.query(api.thread_tools.poll, {
			threadId: "wrong-thread",
			pollId,
		}),
		null,
	);
	assert.equal(
		await outsider.client.query(api.thread_tools.poll, {
			threadId: "club",
			pollId,
		}),
		null,
	);
	await assert.rejects(player.client.mutation(api.thread_tools.create, draft));
	await assert.rejects(
		owner.client.mutation(api.thread_tools.create, {
			...draft,
			question: "Changed question",
		}),
	);
	const before = (
		await player.client.query(api.thread_tools.read, { threadId: "club" })
	).polls.find((poll) => poll.id === pollId);
	assert(before);
	assert.equal(before.counts, undefined);
	assert.equal(before.canClose, false);
	await assert.rejects(
		player.client.mutation(api.thread_tools.vote, { pollId, choices: [0, 1] }),
	);
	await assert.rejects(
		outsider.client.mutation(api.thread_tools.vote, { pollId, choices: [0] }),
	);
	await Promise.all(
		Array.from({ length: 3 }, () =>
			player.client.mutation(api.thread_tools.vote, { pollId, choices: [1] }),
		),
	);
	const after = (
		await player.client.query(api.thread_tools.read, { threadId: "club" })
	).polls.find((poll) => poll.id === pollId);
	assert(after);
	assert.deepEqual(after.counts, [0, 1]);
	assert.equal(after.voters, 1);
	await player.client.mutation(api.thread_tools.vote, { pollId, choices: [0] });
	const changed = (
		await player.client.query(api.thread_tools.read, { threadId: "club" })
	).polls.find((poll) => poll.id === pollId);
	assert.deepEqual(changed?.counts, [1, 0]);
	await assert.rejects(
		player.client.mutation(api.thread_tools.close, { pollId }),
	);
	await owner.client.mutation(api.thread_tools.close, { pollId });
	await assert.rejects(
		player.client.mutation(api.thread_tools.vote, { pollId, choices: [1] }),
	);
	await assert.rejects(
		outsider.client.query(api.thread_tools.read, {
			threadId: "not-in-this-club",
		}),
	);
	const messageId = (
		await owner.client.query(api.messaging.list, {
			threadId: "club",
			paginationOpts: { cursor: null, numItems: 5 },
		})
	).page.at(0)?.id;
	assert(messageId);
	await assert.rejects(
		player.client.mutation(api.thread_tools.pin, {
			threadId: "club",
			messageId,
			pinned: true,
		}),
	);
	await owner.client.mutation(api.thread_tools.pin, {
		threadId: "club",
		messageId,
		pinned: true,
	});
	await owner.client.mutation(api.thread_tools.pin, {
		threadId: "club",
		messageId,
		pinned: true,
	});
	assert.equal(
		(await player.client.query(api.thread_tools.read, { threadId: "club" }))
			.pins.length,
		1,
	);
	await owner.client.mutation(api.thread_tools.pin, {
		threadId: "club",
		messageId,
		pinned: false,
	});
	assert.equal(
		(await player.client.query(api.thread_tools.read, { threadId: "club" }))
			.pins.length,
		0,
	);
	const timedDraft = {
		...draft,
		key: crypto.randomUUID(),
		closesAt: Date.now() + 1600,
	};
	const timedId = await owner.client.mutation(
		api.thread_tools.create,
		timedDraft,
	);
	const reactive = new ConvexClient("http://127.0.0.1:3210", { logger: false });
	reactive.setAuth(async (): Promise<string> => player.token);
	try {
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(
				(): void =>
					reject(new Error("Poll did not close reactively at its deadline.")),
				8000,
			);
			reactive.onUpdate(
				api.thread_tools.read,
				{ threadId: "club" },
				(tools): void => {
					if (
						tools.polls.some(
							(poll) =>
								poll.id === timedId && poll.closed && poll.counts !== undefined,
						)
					) {
						clearTimeout(timer);
						resolve();
					}
				},
				(error): void => {
					clearTimeout(timer);
					reject(error);
				},
			);
		});
		assert.equal(
			await owner.client.mutation(api.thread_tools.create, timedDraft),
			timedId,
		);
	} finally {
		await reactive.close();
	}
	const ownMessages = Array.from({ length: 4 }, (): string =>
		crypto.randomUUID(),
	);
	for (const id of ownMessages)
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "send-message",
				id,
				threadId: "club",
				body: "Pinned fixture",
				time: "12:00 PM",
			},
		});
	for (const messageId of ownMessages.slice(0, 3))
		await owner.client.mutation(api.thread_tools.pin, {
			threadId: "club",
			messageId,
			pinned: true,
		});
	const fourthMessage = ownMessages.at(3);
	assert(fourthMessage);
	await assert.rejects(
		owner.client.mutation(api.thread_tools.pin, {
			threadId: "club",
			messageId: fourthMessage,
			pinned: true,
		}),
	);
	for (const messageId of ownMessages.slice(0, 3))
		await owner.client.mutation(api.club.apply, {
			action: { type: "delete-message", messageId },
		});
	assert.equal(
		(await owner.client.query(api.thread_tools.read, { threadId: "club" })).pins
			.length,
		0,
	);
	await owner.client.mutation(api.thread_tools.pin, {
		threadId: "club",
		messageId: fourthMessage,
		pinned: true,
	});
	const olderDraft = {
		...draft,
		key: crypto.randomUUID(),
		question: "An older inline poll?",
	};
	const olderId = await owner.client.mutation(
		api.thread_tools.create,
		olderDraft,
	);
	for (const [index, actor] of Array.from({ length: 40 }, (_, index) =>
		index < 20 ? owner : player,
	).entries())
		await actor.client.mutation(api.thread_tools.create, {
			...draft,
			key: crypto.randomUUID(),
			question: `Chronological fixture ${index}?`,
		});
	const recent = await player.client.query(api.thread_tools.read, {
		threadId: "club",
	});
	assert.equal(recent.polls.length, 40);
	assert(!recent.polls.some((poll) => poll.id === olderId));
	const older = await player.client.query(api.thread_tools.poll, {
		threadId: "club",
		pollId: olderId,
	});
	assert.equal(older?.messageId, pollMessageId(olderId));
	await player.client.mutation(api.thread_tools.vote, {
		pollId: olderId,
		choices: [1],
	});
	assert.deepEqual(
		(
			await player.client.query(api.thread_tools.poll, {
				threadId: "club",
				pollId: olderId,
			})
		)?.counts,
		[0, 1],
	);
	const observer = new ConvexClient("http://127.0.0.1:3210", { logger: false });
	observer.setAuth(async (): Promise<string> => player.token);
	try {
		const changed = new Promise<void>((resolve, reject) => {
			const timer = setTimeout(
				(): void =>
					reject(new Error("Older inline poll vote was not reactive")),
				8000,
			);
			observer.onUpdate(
				api.thread_tools.poll,
				{ threadId: "club", pollId: olderId },
				(poll): void => {
					if (poll?.counts?.at(0) === 1 && poll.counts.at(1) === 1) {
						clearTimeout(timer);
						resolve();
					}
				},
				(error): void => {
					clearTimeout(timer);
					reject(error);
				},
			);
		});
		await owner.client.mutation(api.thread_tools.vote, {
			pollId: olderId,
			choices: [0],
		});
		await changed;
	} finally {
		await observer.close();
	}
	const ownerAccount = await owner.client.query(api.account.current, {});
	const playerAccount = await player.client.query(api.club.current, {});
	assert(ownerAccount && playerAccount);
	const direct = await owner.client.mutation(api.messaging.openDirect, {
		recipientId: `person:${playerAccount.account.personId}`,
	});
	const privateDraft = {
		...draft,
		key: crypto.randomUUID(),
		threadId: direct,
		question: "Private poll?",
	};
	const privateId = await owner.client.mutation(
		api.thread_tools.create,
		privateDraft,
	);
	const spectator = await run.fixture("Unrelated same-club poll member");
	await spectator.client.mutation(api.club.requestToJoin, { clubCode: code });
	assert.equal(
		await spectator.client.query(api.thread_tools.poll, {
			threadId: direct,
			pollId: privateId,
		}),
		null,
	);
	assert.equal(
		await spectator.client.query(api.messaging.message, {
			messageId: pollMessageId(privateId),
		}),
		null,
	);
	await assert.rejects(
		spectator.client.mutation(api.thread_tools.vote, {
			pollId: privateId,
			choices: [0],
		}),
	);
	await player.client.mutation(api.moderation.block, {
		targetId: ownerAccount.id,
		blocked: true,
	});
	assert.equal(
		await player.client.query(api.thread_tools.poll, {
			threadId: direct,
			pollId: privateId,
		}),
		null,
	);
	await assert.rejects(
		player.client.mutation(api.thread_tools.vote, {
			pollId: privateId,
			choices: [0],
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.thread_tools.create, privateDraft),
	);
	await player.client.mutation(api.moderation.block, {
		targetId: ownerAccount.id,
		blocked: false,
	});
	await player.client.mutation(api.moderation.report, {
		messageId: anchor.id,
		reason: "Fictional pause-boundary check",
		blockAuthor: false,
	});
	const report = (
		await owner.client.query(api.moderation.queue, {})
	).reports.find((report) => report.messageId === anchor.id);
	assert(report);
	await owner.client.mutation(api.moderation.review, {
		reportId: report._id,
		decision: "dismissed",
		pauseChat: true,
	});
	await assert.rejects(
		owner.client.mutation(api.thread_tools.create, olderDraft),
	);
	await assert.rejects(
		owner.client.mutation(api.thread_tools.vote, {
			pollId: olderId,
			choices: [0],
		}),
	);
	await owner.client.mutation(api.moderation.restore, {
		userId: ownerAccount.id,
	});
	await owner.client.mutation(api.chat_policy.save, {
		phrases: ["blocked fixture phrase"],
	});
	await assert.rejects(
		owner.client.mutation(api.thread_tools.create, {
			...draft,
			key: crypto.randomUUID(),
			options: ["Allowed", "Blocked fixture phrase"],
		}),
	);
	await owner.client.mutation(api.chat_policy.save, { phrases: [] });
	const forged = {
		type: "send-message",
		id: crypto.randomUUID(),
		threadId: "club",
		body: "Fake poll anchor",
		time: "Now",
		pollId: olderId,
	} as const;
	await assert.rejects(
		owner.client.mutation(api.club.apply, { action: forged }),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "edit-message",
				messageId: anchor.id,
				body: "Spoofed poll question",
			},
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "delete-message", messageId: pollMessageId(privateId) },
	});
	assert.equal(
		await player.client.query(api.thread_tools.poll, {
			threadId: direct,
			pollId: privateId,
		}),
		null,
	);
	await assert.rejects(
		player.client.mutation(api.thread_tools.vote, {
			pollId: privateId,
			choices: [0],
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.thread_tools.create, privateDraft),
	);
	await run.dispose(player);
	const afterErasure = await owner.client.query(api.thread_tools.poll, {
		threadId: "club",
		pollId: olderId,
	});
	assert.deepEqual(afterErasure?.counts, [1, 0]);
	assert.equal(afterErasure?.voters, 1);
	console.log(
		"Chat poll and pin verification passed: atomic timeline anchors/unread/read, old polls beyond recent40 with reactive votes, exact retries, concurrent aggregates, private/cross-club/block/pause/filter boundaries, trusted metadata, deletion/erasure, closure and pins.",
	);
} finally {
	await run.close();
}
