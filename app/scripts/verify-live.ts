import assert from "node:assert/strict";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { balance, eventResponse } from "../src/domain/app-rules";
import type { EventDraft } from "../src/domain/app-types";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("Run verification against the isolated local backend only.");
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
			email: `${name.replaceAll(" ", "-").toLowerCase()}-${runId}@example.test`,
			password: `${crypto.randomUUID()}Aa1!`,
		},
	});
	if (!result.tokens)
		throw new Error("Authentication did not return a session.");
	client.setAuth(result.tokens.token);
	return { client, token: result.tokens.token };
};
const publicClient = new ConvexHttpClient(url, { logger: false });
assert.equal(await publicClient.query(api.club.current, {}), null);
const owner = await signUp("Verification Owner");
const clubId = await owner.client.mutation(api.club.create, {
	name: `Verification ${runId.slice(0, 8)}`,
	samples: true,
});
const parent = await signUp("Verification Parent");
assert.equal(await parent.client.query(api.club.current, {}), null);
await parent.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const initial = await owner.client.query(api.club.current, {});
assert(initial);
const request = initial.requests.at(0);
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
assert.deepEqual(family.account.children, ["sam"]);
assert.deepEqual(
	family.data.feedback.map((entry) => entry.id),
	["f-sam"],
);
assert(!family.data.conversations.some((entry) => entry.id === "casey"));
assert(
	family.data.payments.every((entry) =>
		["jamie", "sam"].includes(entry.personId),
	),
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "youth-thu",
			personId: "mila",
			response: "unavailable",
		},
	}),
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId: "club-thu" },
	}),
);
await parent.client.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: "club-thu",
		personId: "sam",
		response: "unavailable",
	},
});
const afterResponse = await owner.client.query(api.club.current, {});
assert(afterResponse);
assert.equal(
	eventResponse(afterResponse.data, "club-thu", "sam").response,
	"unavailable",
);
assert.equal(
	eventResponse(afterResponse.data, "youth-thu", "sam").response,
	"going",
);
const draft: EventDraft = {
	title: "Capacity test",
	date: "2026-11-01",
	start: "19:45",
	end: "21:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 1,
	repeat: "once",
	description: "",
};
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: { type: "create-event", id: "denied", draft },
	}),
);
await owner.client.mutation(api.club.apply, {
	action: { type: "create-event", id: "capacity", draft },
});
await Promise.all([
	owner.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "capacity-0",
			personId: "alex",
			response: "going",
		},
	}),
	parent.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "capacity-0",
			personId: "sam",
			response: "going",
		},
	}),
]);
const capacity = await owner.client.query(api.club.current, {});
assert(capacity);
assert.equal(
	capacity.data.events.find((event) => event.id === "capacity-0")?.closesAt,
	Date.parse("2026-11-02T01:45:00Z"),
);
assert.equal(
	capacity.data.responses.filter(
		(entry) => entry.eventId === "capacity-0" && entry.response === "going",
	).length,
	1,
);
assert.equal(
	capacity.data.responses.filter(
		(entry) => entry.eventId === "capacity-0" && entry.response === "waiting",
	).length,
	1,
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "payment",
		payment: { id: "pay", personId: "sam", amount: 4000, note: "Verification" },
	},
});
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "payment",
			payment: {
				id: "denied-pay",
				personId: "sam",
				amount: 100,
				note: "Denied",
			},
		},
	}),
);
const paid = await owner.client.query(api.club.current, {});
assert(paid);
assert.equal(balance(paid.data, "sam"), 0);
await owner.client.mutation(api.club.apply, {
	action: { type: "set-goal", personId: "sam", goal: "Scan before receiving" },
});
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: { type: "set-goal", personId: "sam", goal: "Unauthorized change" },
	}),
);
const freshClient = new ConvexHttpClient(url, { logger: false });
freshClient.setAuth(parent.token);
const savedGoal = await freshClient.query(api.club.current, {});
assert.equal(
	savedGoal?.data.members.find((member) => member.id === "sam")?.goal,
	"Scan before receiving",
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "issue",
		loan: {
			id: "loan",
			itemId: "fins-021",
			personId: "sam",
			due: "2026-09-30",
			returned: false,
		},
	},
});
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "issue",
			loan: {
				id: "second-loan",
				itemId: "fins-021",
				personId: "mila",
				due: "2026-09-30",
				returned: false,
			},
		},
	}),
);
await owner.client.mutation(api.club.apply, {
	action: { type: "return", loanId: "loan" },
});
await owner.client.mutation(api.club.apply, {
	action: {
		type: "save-feedback",
		feedback: {
			id: "new-feedback",
			personId: "sam",
			authorId: "spoofed",
			body: "Live feedback",
			visibility: "draft",
			date: "2026-09-07",
		},
	},
});
const unpublished = await parent.client.query(api.club.current, {});
assert(
	unpublished &&
		!unpublished.data.feedback.some((entry) => entry.id === "new-feedback"),
);
await owner.client.mutation(api.club.apply, {
	action: { type: "publish-feedback", id: "new-feedback" },
});
const shared = await parent.client.query(api.club.current, {});
assert(
	shared?.data.feedback.some(
		(entry) =>
			entry.id === "new-feedback" && entry.authorId === initial.account.id,
	),
);
const directFeedback = {
	id: "direct-feedback",
	personId: "sam",
	authorId: "spoofed",
	body: "Published directly",
	visibility: "published",
	date: "2026-09-08",
} as const;
await owner.client.mutation(api.club.apply, {
	action: { type: "save-feedback", feedback: directFeedback },
});
await owner.client.mutation(api.club.apply, {
	action: { type: "save-feedback", feedback: directFeedback },
});
assert.equal(
	(await parent.client.query(api.club.current, {}))?.data.feedback.find(
		(entry) => entry.id === directFeedback.id,
	)?.body,
	directFeedback.body,
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "save-feedback",
		feedback: { ...directFeedback, id: "editable-draft", visibility: "draft" },
	},
});
await owner.client.mutation(api.club.apply, {
	action: {
		type: "save-feedback",
		feedback: {
			...directFeedback,
			id: "editable-draft",
			visibility: "draft",
			body: "Edited draft",
		},
	},
});
assert.equal(
	(await owner.client.query(api.club.current, {}))?.data.feedback.find(
		(entry) => entry.id === "editable-draft",
	)?.body,
	"Edited draft",
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: { type: "delete-feedback", id: "editable-draft" },
	}),
);
await owner.client.mutation(api.club.apply, {
	action: { type: "delete-feedback", id: "editable-draft" },
});
assert(
	!(await owner.client.query(api.club.current, {}))?.data.feedback.some(
		(entry) => entry.id === "editable-draft",
	),
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "add-season",
		season: {
			id: "next-season",
			name: "2027–2028",
			start: "2027-09-01",
			end: "2028-08-31",
		},
	},
});
const seriesDraft: EventDraft = {
	...draft,
	title: "Restricted series",
	date: "2027-10-04",
	repeat: "fortnightly",
	occurrences: 3,
	eligiblePersonIds: ["sam"],
	seasonId: "next-season",
	signupOpens: "now",
	signupCloses: "hour",
};
await owner.client.mutation(api.club.apply, {
	action: { type: "create-event", id: "restricted", draft: seriesDraft },
});
await parent.client.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: "restricted-0",
		personId: "sam",
		response: "going",
	},
});
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "restricted-0",
			personId: "alex",
			response: "going",
		},
	}),
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "attendance",
		eventId: "restricted-0",
		personId: "sam",
		attendance: "late",
	},
});
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: "restricted-0",
			draft: seriesDraft,
			scope: "series",
		},
	}),
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "edit-event",
		eventId: "restricted-0",
		draft: { ...seriesDraft, title: "Single edit" },
		scope: "single",
	},
});
const singleEdit = await owner.client.query(api.club.current, {});
assert.equal(
	singleEdit?.data.events.find((event) => event.id === "restricted-0")?.title,
	"Single edit",
);
assert.equal(
	singleEdit?.data.events.find((event) => event.id === "restricted-1")?.title,
	"Restricted series",
);
await owner.client.mutation(api.club.apply, {
	action: {
		type: "edit-event",
		eventId: "restricted-0",
		draft: {
			...seriesDraft,
			title: "All edited",
			date: "2027-10-05",
			eligiblePersonIds: ["alex"],
		},
		scope: "series",
	},
});
const seriesEdit = await owner.client.query(api.club.current, {});
assert(seriesEdit);
const occurrences = seriesEdit.data.events.filter(
	(event) => event.seriesId === "restricted",
);
assert.equal(occurrences.length, 3);
assert(
	occurrences.every(
		(event) => event.title === "All edited" && event.seasonId === "next-season",
	),
);
assert.deepEqual(
	occurrences.map((event) => event.date),
	["2027-10-05", "2027-10-19", "2027-11-02"],
);
assert.equal(
	eventResponse(seriesEdit.data, "restricted-0", "sam").response,
	"unavailable",
);
assert.equal(
	eventResponse(seriesEdit.data, "restricted-0", "sam").attendance,
	"late",
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "restricted-0",
			personId: "sam",
			response: "going",
		},
	}),
);
console.log(
	"Live event and feedback editing passed: seasons, restricted registration, single/series edits, retained attendance, direct publication and draft editing/deletion.",
);
await parent.client.mutation(api.club.apply, {
	action: {
		type: "send-message",
		id: "parent-message",
		threadId: "club",
		body: "Parent message",
		time: "Now",
	},
});
const message = await owner.client.query(api.messaging.message, {
	messageId: "parent-message",
});
assert.equal(message?.author, "Verification Parent");
const live = new ConvexClient(url, { logger: false });
live.setAuth(async (): Promise<string> => owner.token);
const received = Promise.withResolvers<void>();
const stop = live.onUpdate(api.club.current, {}, (value): void => {
	if (
		value?.data.members.find((entry) => entry.id === "mila")?.registration ===
		"approved"
	)
		received.resolve();
});
const timeout = setTimeout(
	(): void => received.reject(new Error("Live subscription did not update.")),
	15000,
);
try {
	await owner.client.mutation(api.club.apply, {
		action: { type: "registration", personId: "mila", status: "approved" },
	});
	await received.promise;
} finally {
	clearTimeout(timeout);
	stop();
	await live.close();
}
await owner.client.mutation(api.club.setAccess, {
	accountId: family.account.id,
	children: [],
	coachPrograms: [],
	admin: false,
});
const revoked = await parent.client.query(api.club.current, {});
assert(
	revoked &&
		revoked.data.feedback.length === 0 &&
		revoked.data.payments.length === 0,
);
await assert.rejects(
	parent.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: "club-thu",
			personId: "sam",
			response: "going",
		},
	}),
);
const outsider = await signUp("Verification Outsider");
await outsider.client.mutation(api.club.requestToJoin, { clubCode: clubId });
const pending = await owner.client.query(api.club.current, {});
const otherRequest = pending?.requests.at(0);
assert(otherRequest);
await outsider.client.mutation(api.club.create, {
	name: "Separate verification club",
	samples: false,
});
await assert.rejects(
	owner.client.mutation(api.club.approveRequest, {
		requestId: otherRequest.id,
		personId: "taylor",
		children: [],
		coachPrograms: [],
		admin: true,
	}),
);
await assert.rejects(
	owner.client.mutation(api.club.setAccess, {
		accountId:
			(await outsider.client.query(api.club.current, {}))?.account.id ?? "",
		children: [],
		coachPrograms: [],
		admin: true,
	}),
);
await owner.client.mutation(api.club.setAccess, {
	accountId: initial.account.id,
	children: [],
	coachPrograms: [],
	admin: true,
});
const adminOnly = await owner.client.query(api.club.current, {});
assert(adminOnly);
assert(
	adminOnly.data.feedback.every(
		(entry) =>
			entry.personId === adminOnly.account.personId &&
			entry.visibility === "published",
	),
);
assert.deepEqual(adminOnly?.data.plans, {});
await assert.rejects(
	owner.client.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId: "club-thu" },
	}),
);
console.log(
	"Live Convex checks passed: authentication, approval, privacy, RSVP isolation, concurrent capacity, Alberta time, payments, equipment, goals, publishing, message identity, realtime updates, revocation and club isolation.",
);
