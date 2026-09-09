import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import { localRun } from "./local-checks";
import { localCode, signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixture = async (
	label: string,
): Promise<{
	client: ConvexHttpClient;
	email: string;
	password: string;
	token: string;
}> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const email = `security-${label}-${crypto.randomUUID()}@example.test`;
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: { flow: "signUp", email, password, name: label },
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	return { client, email, password, token: result.tokens.token };
};
const unverified = new ConvexHttpClient(url, { logger: false });
const pendingEmail = `security-pending-${crypto.randomUUID()}@example.test`;
const pendingPassword = crypto.randomUUID();
const started = await unverified.action(api.auth.signIn, {
	provider: "password",
	params: {
		flow: "signUp",
		email: pendingEmail,
		password: pendingPassword,
		name: "Pending",
	},
});
assert(!started.tokens);
const firstCode = await localCode(pendingEmail);
await assert.rejects(
	unverified.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "email-verification", email: pendingEmail },
	}),
	/Wait a minute/,
);
await assert.rejects(
	unverified.mutation(api.club.create, { name: "Must fail", samples: false }),
);
await assert.rejects(
	unverified.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "email-verification", email: pendingEmail, code: "wrong" },
	}),
);
const verified = await unverified.action(api.auth.signIn, {
	provider: "password",
	params: {
		flow: "email-verification",
		email: pendingEmail,
		code: firstCode,
	},
});
assert(verified.tokens);
unverified.setAuth(verified.tokens.token);
assert(await unverified.query(api.account.current, {}));
const limitedClient = new ConvexHttpClient(url, { logger: false });
const limitedEmail = `security-limited-${crypto.randomUUID()}@example.test`;
await limitedClient.action(api.auth.signIn, {
	provider: "password",
	params: {
		flow: "signUp",
		email: limitedEmail,
		password: crypto.randomUUID(),
		name: "Limited",
	},
});
const limitedCode = await localCode(limitedEmail);
for (const _attempt of Array.from({ length: 10 }))
	await assert.rejects(
		limitedClient.action(api.auth.signIn, {
			provider: "password",
			params: {
				flow: "email-verification",
				email: limitedEmail,
				code: "wrong",
			},
		}),
	);
await assert.rejects(
	limitedClient.action(api.auth.signIn, {
		provider: "password",
		params: {
			flow: "email-verification",
			email: ` ${limitedEmail.toUpperCase()} `,
			code: limitedCode,
		},
	}),
);
const owner = await fixture("Owner");
const clubId = await owner.client.mutation(api.club.create, {
	name: "Safety test",
	samples: true,
});
const ownerInfo = await owner.client.query(api.account.current, {});
assert(ownerInfo);
const parent = await fixture("Parent");
await parent.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const parentInfo = await parent.client.query(api.account.current, {});
assert.equal(parentInfo?.pending.at(0)?.state, "pending");
const request = (await owner.client.query(api.club.current, {}))?.requests.at(
	0,
);
assert(request);
await owner.client.mutation(api.account.declineRequest, {
	requestId: request.id,
});
assert.equal(
	(await parent.client.query(api.account.current, {}))?.pending.at(0)?.state,
	"declined",
);
await parent.client.mutation(api.account.cancelRequest, {
	requestId: request.id,
});
await parent.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const second = (await owner.client.query(api.club.current, {}))?.requests.at(0);
assert(second);
await owner.client.mutation(api.club.approveRequest, {
	requestId: second.id,
	personId: "jamie",
	children: ["sam"],
	coachPrograms: [],
	admin: false,
});
const member = await parent.client.query(api.account.current, {});
assert(member);
await assert.rejects(
	owner.client.action(api.account_actions.deleteAccount, {
		password: owner.password,
	}),
);
await owner.client.mutation(api.chat_policy.save, {
	phrases: ["blocked phrase"],
});
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "filter",
			threadId: "club",
			body: "BLOCKED PHRASE",
			time: "Now",
		},
	}),
);
const stranger = await fixture("Stranger");
await stranger.client.mutation(api.club.create, {
	name: "Other club",
	samples: false,
});
const token = `ExpoPushToken[${crypto.randomUUID()}]`;
const device = {
	installationId: crypto.randomUUID(),
	token,
	platform: "ios" as const,
};
await parent.client.mutation(api.notifications.register, device);
await parent.client.mutation(api.notifications.register, device);
assert.equal(
	(await parent.client.query(api.notifications.settings, {})).devices,
	1,
);
await assert.rejects(
	parent.client.mutation(api.notifications.register, {
		...device,
		token: "invalid",
	}),
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "send-message",
		id: "reported",
		threadId: "club",
		body: "Reportable content",
		time: "Now",
	},
});
await parent.client.mutation(api.moderation.report, {
	messageId: "reported",
	reason: "Harassment",
	blockAuthor: false,
});
await parent.client.mutation(api.moderation.report, {
	messageId: "reported",
	reason: "Duplicate",
	blockAuthor: false,
});
assert.equal(
	(await owner.client.query(api.moderation.queue, {})).reports.length,
	1,
);
assert.equal(
	(await stranger.client.query(api.moderation.queue, {})).reports.length,
	0,
);
assert.equal(
	(await parent.client.query(api.moderation.queue, {})).reports.length,
	0,
);
const report = (await owner.client.query(api.moderation.queue, {})).reports.at(
	0,
);
assert(report);
await assert.rejects(
	parent.client.mutation(api.moderation.review, {
		reportId: report._id,
		decision: "removed",
		pauseChat: false,
	}),
);
await assert.rejects(
	stranger.client.mutation(api.moderation.report, {
		messageId: "reported",
		reason: "Guess",
		blockAuthor: false,
	}),
);
const state = await localRun(
	"local_checks:inspect",
	internal.local_checks.inspect,
	{ userId: member.id, clubId },
);
const job = state.jobs.find((job) => job.entityId === "reported");
assert(job);
const deliveryId = await localRun(
	"local_checks:pendingDelivery",
	internal.local_checks.pendingDelivery,
	{ userId: member.id, jobId: job._id },
);
const payload = await localRun(
	"notifications:payload",
	internal.notifications.payload,
	{ id: deliveryId },
);
assert(payload);
assert.equal(payload.path, "/conversation?id=club");
assert(!payload.body.includes("Reportable"));
await owner.client.mutation(api.club.apply, {
	action: {
		type: "create-event",
		id: "push-session",
		draft: {
			title: "Private practice",
			date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
			start: "18:00",
			end: "19:00",
			venue: "Pool",
			program: "club",
			kind: "training",
			capacity: 20,
			repeat: "once",
			eligiblePersonIds: ["sam"],
			signupOpens: "now",
			signupCloses: "start",
			description: "",
		},
	},
});
const createdEvent = (
	await owner.client.query(api.club.current, {})
)?.data.events.find((event) => event.title === "Private practice");
assert(createdEvent);
const eventJobs = await localRun(
	"local_checks:inspect",
	internal.local_checks.inspect,
	{ userId: member.id, clubId },
);
const eventJob = eventJobs.jobs.find(
	(job) =>
		job.kind === "events" &&
		job.entityId === createdEvent.id &&
		job.eventPhase === "open",
);
assert(eventJob);
const eventDelivery = await localRun(
	"local_checks:pendingDelivery",
	internal.local_checks.pendingDelivery,
	{ userId: member.id, jobId: eventJob._id },
);
assert.equal(
	(
		await localRun("notifications:payload", internal.notifications.payload, {
			id: eventDelivery,
		})
	)?.path,
	`/session?event=${createdEvent.id}`,
);
await owner.client.mutation(api.club.setAccess, {
	accountId: member.id,
	children: [],
	coachPrograms: [],
	admin: false,
});
assert.equal(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: eventDelivery,
	}),
	null,
);
await owner.client.mutation(api.club.setAccess, {
	accountId: member.id,
	children: ["sam"],
	coachPrograms: [],
	admin: false,
});
await owner.client.mutation(api.club.apply, {
	action: { type: "cancel-event", eventId: createdEvent.id },
});
assert.equal(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: eventDelivery,
	}),
	null,
);
await parent.client.mutation(api.notifications.preferences, {
	kind: "messages",
	enabled: false,
});
assert.equal(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: deliveryId,
	}),
	null,
);
await parent.client.mutation(api.notifications.preferences, {
	kind: "messages",
	enabled: true,
});
await Promise.all([
	parent.client.mutation(api.notifications.preferences, {
		kind: "events",
		enabled: false,
	}),
	parent.client.mutation(api.notifications.preferences, {
		kind: "feedback",
		enabled: false,
	}),
]);
assert.deepEqual(
	(await parent.client.query(api.notifications.settings, {})).preferences,
	{
		messages: true,
		events: false,
		feedback: false,
		announcements: true,
	},
);
await parent.client.mutation(api.moderation.block, {
	targetId: ownerInfo.id,
	blocked: true,
});
assert.equal(
	await parent.client.query(api.messaging.message, { messageId: "reported" }),
	null,
);
assert.equal(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: deliveryId,
	}),
	null,
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "create-thread",
			id: "blocked-dm",
			recipientId: ownerInfo.id,
			title: "Owner",
		},
	}),
);
await parent.client.mutation(api.moderation.block, {
	targetId: ownerInfo.id,
	blocked: false,
});
assert(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: deliveryId,
	}),
);
await owner.client.mutation(api.moderation.review, {
	reportId: report._id,
	decision: "removed",
	pauseChat: true,
});
assert(
	(await owner.client.query(api.messaging.message, { messageId: "reported" }))
		?.deleted,
);
assert.equal(
	await localRun("notifications:payload", internal.notifications.payload, {
		id: deliveryId,
	}),
	null,
);
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "send-message",
			id: "paused",
			threadId: "club",
			body: "Blocked",
			time: "Now",
		},
	}),
);
assert.equal(
	await localRun("images:canUpload", internal.images.canUpload, {
		userId: ownerInfo.id,
		threadId: "club",
	}),
	false,
);
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "create-thread",
			id: "paused-thread",
			title: "Private",
			recipientId: member.id,
		},
	}),
);
await owner.client.mutation(api.moderation.restore, { userId: ownerInfo.id });
assert.equal(
	await localRun("images:canUpload", internal.images.canUpload, {
		userId: ownerInfo.id,
		threadId: "club",
	}),
	true,
);
await localRun("notifications:record", internal.notifications.record, {
	id: deliveryId,
	error: "DeviceNotRegistered",
	retry: false,
});
assert.equal(
	(await parent.client.query(api.notifications.settings, {})).devices,
	0,
);
const otherSession = new ConvexHttpClient(url, { logger: false });
const session = await otherSession.action(api.auth.signIn, {
	provider: "password",
	params: { flow: "signIn", email: parent.email, password: parent.password },
});
assert(session.tokens);
otherSession.setAuth(session.tokens.token);
await parent.client.mutation(api.account.signOutOthers, {});
assert.equal(await otherSession.query(api.club.current, {}), null);
await assert.rejects(
	otherSession.mutation(api.club.apply, {
		action: { type: "set-goal", personId: "jamie", goal: "Old session" },
	}),
);
await localRun(
	"local_checks:resetMailCooldown",
	internal.local_checks.resetMailCooldown,
	{ email: parent.email },
);
const recovery = new ConvexHttpClient(url, { logger: false });
await recovery.action(api.auth.signIn, {
	provider: "password",
	params: { flow: "reset", email: parent.email },
});
const resetCode = await localCode(parent.email);
await assert.rejects(
	recovery.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "reset", email: parent.email.toUpperCase() },
	}),
	/Wait a minute/,
);
await assert.rejects(
	recovery.action(api.auth.signIn, {
		provider: "password",
		params: {
			flow: "reset-verification",
			email: owner.email,
			code: resetCode,
			newPassword: crypto.randomUUID(),
		},
	}),
);
const newPassword = crypto.randomUUID();
const reset = await recovery.action(api.auth.signIn, {
	provider: "password",
	params: {
		flow: "reset-verification",
		email: parent.email.toUpperCase(),
		code: resetCode,
		newPassword,
	},
});
assert(reset.tokens);
recovery.setAuth(reset.tokens.token);
assert.equal(await parent.client.query(api.club.current, {}), null);
await assert.rejects(
	parent.client.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "signIn", email: parent.email, password: parent.password },
	}),
);
await assert.rejects(
	recovery.action(api.account_actions.deleteAccount, { password: "incorrect" }),
);
await recovery.mutation(api.notifications.register, device);
const feed = await recovery.action(api.calendar_tokens.enable, {
	personId: "sam",
	includeWaitlisted: false,
});
await recovery.mutation(api.messaging.markRead, {
	threadId: "club",
	messageId: "reported",
});
assert.equal(
	(
		await localRun("local_checks:inspect", internal.local_checks.inspect, {
			userId: member.id,
			clubId,
		})
	).reads,
	1,
);
await recovery.action(api.account_actions.deleteAccount, {
	password: newPassword,
});
assert.equal(await recovery.query(api.account.current, {}), null);
assert.equal(await recovery.query(api.club.current, {}), null);
assert.equal(
	await localRun(
		"local_checks:emailRecords",
		internal.local_checks.emailRecords,
		{ email: parent.email },
	),
	0,
);
assert.equal(
	await localRun("local_email:latest", internal.local_email.latest, {
		email: parent.email,
	}),
	null,
);
const erased = await localRun(
	"local_checks:inspect",
	internal.local_checks.inspect,
	{ userId: member.id, clubId },
);
assert.deepEqual(
	[
		erased.exists,
		erased.sessions,
		erased.accounts,
		erased.images,
		erased.feeds,
		erased.devices,
		erased.reads,
	],
	[false, 0, 0, 0, 0, 0, 0],
);
assert.equal(
	(await fetch(`http://127.0.0.1:3211/calendar.ics?token=${feed.token}`))
		.status,
	404,
);
const remaining = await owner.client.query(api.club.current, {});
assert(!remaining?.data.members.some((entry) => entry.id === "jamie"));
assert(remaining?.data.members.some((entry) => entry.id === "sam"));
const nextOwner = await fixture("NextOwner");
await nextOwner.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const nextRequest = (
	await owner.client.query(api.club.current, {})
)?.requests.at(0);
assert(nextRequest);
await owner.client.mutation(api.club.approveRequest, {
	requestId: nextRequest.id,
	personId: "sam",
	children: [],
	coachPrograms: [],
	admin: true,
});
const nextInfo = await nextOwner.client.query(api.account.current, {});
assert(nextInfo);
await owner.client.action(api.account_actions.deleteAccount, {
	password: owner.password,
	transferTo: nextInfo.id,
});
assert.equal(await owner.client.query(api.account.current, {}), null);
assert.equal(
	(await nextOwner.client.query(api.account.current, {}))?.owner,
	true,
);
await nextOwner.client.action(api.account_actions.deleteAccount, {
	password: nextOwner.password,
});
assert.equal(await nextOwner.client.query(api.account.current, {}), null);
console.log(
	"Live account, moderation and push checks passed: verification, approval/decline, report isolation, blocking, removal, suspension, notification preferences/access checks, token cleanup, password recovery, immediate session revocation and account/club deletion.",
);
