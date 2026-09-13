import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("Use the isolated local backend only.");
const runId = crypto.randomUUID();
const signUp = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			name,
			email: `discussion-${name}-${runId}@example.test`,
			password: `${crypto.randomUUID()}Aa1!`,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	return client;
};
const owner = await signUp("owner");
const clubId = await owner.mutation(api.club.create, {
	name: `Discussion ${runId.slice(0, 8)}`,
	samples: true,
});
const parent = await signUp("parent");
await parent.mutation(api.club.requestToJoin, { clubCode: clubId });
const workspace = await owner.query(api.club.current, {});
assert(workspace);
const request = workspace.requests.at(0);
assert(request);
await owner.mutation(api.club.approveRequest, {
	requestId: request.id,
	personId: "jamie",
	children: ["sam"],
	coachPrograms: [],
	admin: false,
});
const event = workspace.data.events.at(0);
assert(event);
const threadId = await owner.mutation(api.messaging.openSession, {
	eventId: event.id,
});
assert.equal(
	await owner.mutation(api.messaging.openSession, { eventId: event.id }),
	threadId,
);
assert.equal(
	await parent.mutation(api.messaging.openSession, { eventId: event.id }),
	threadId,
);
const inbox = await parent.query(api.messaging.inbox, {});
assert.equal(
	inbox.find((thread) => thread.id === threadId)?.title,
	event.title,
);
assert.equal(inbox.find((thread) => thread.id === threadId)?.eventId, event.id);
const direct = await parent.mutation(api.messaging.openDirect, {
	recipientId: workspace.account.id,
});
assert.notEqual(direct, threadId);
const stranger = await signUp("stranger");
await stranger.mutation(api.club.create, {
	name: `Other ${runId.slice(0, 8)}`,
	samples: false,
});
await assert.rejects(
	stranger.mutation(api.messaging.openSession, { eventId: event.id }),
);
assert(
	!(await stranger.query(api.messaging.inbox, {})).some(
		(thread) => thread.id === threadId,
	),
);
const anonymous = new ConvexHttpClient(url, { logger: false });
await assert.rejects(
	anonymous.mutation(api.messaging.openSession, { eventId: event.id }),
);
console.log(
	"Session discussion live checks passed: idempotence, household access, group title, distinct DM, cross-club and anonymous denial. No messages sent.",
);
const home = await parent.query(api.club.current, { screen: "home" });
const accountPage = await parent.query(api.club.current, { screen: "account" });
const membership = await parent.query(api.club.current, {
	screen: "membership",
	id: "sam",
});
assert(home && accountPage && membership);
for (const result of [home, accountPage, membership]) {
	assert(
		result.data.members.every((person) => ["jamie", "sam"].includes(person.id)),
	);
	assert(
		result.data.charges.every((charge) =>
			["jamie", "sam"].includes(charge.personId),
		),
	);
	assert(
		result.data.loans.every((loan) => ["jamie", "sam"].includes(loan.personId)),
	);
}
const seasonId = home.data.seasons.at(0)?.id;
assert(seasonId);
const records = await parent.query(api.home_records.household, { seasonId });
assert.deepEqual(records.map((record) => record.personId).toSorted(), [
	"jamie",
	"sam",
]);
console.log("Home/Account/Membership live household isolation checks passed.");
const schedulePage = await parent.query(api.pages.schedule, {
	audience: "household",
	view: "calendar",
	date: event.date,
	season: "all",
	now: Date.now(),
	paginationOpts: { numItems: 40, cursor: null },
});
const counts = await parent.query(api.pages.calendar, {
	audience: "household",
	from: event.date,
	to: event.date,
	season: "all",
});
const familyPeople = membership.data.members;
assert(
	schedulePage.page.every(({ event: session }) =>
		familyPeople.some(
			(person) =>
				person.programs.length > 0 &&
				(session.program === "all" ||
					person.programs.includes(session.program)) &&
				(!session.eligiblePersonIds ||
					session.eligiblePersonIds.includes(person.id)),
		),
	),
);
assert.equal(
	counts[event.date] ?? 0,
	schedulePage.page.filter((row) => !row.event.cancelled).length,
);
console.log("Household Schedule relevance and calendar counts agree.");
