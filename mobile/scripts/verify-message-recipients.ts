import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixtures: { client: ConvexHttpClient; password: string }[] = [];
const fixture = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			name,
			email: `recipients-${crypto.randomUUID()}@example.test`,
			password,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const owner = await fixture("Recipient admin");
	const clubId = await owner.mutation(api.club.create, {
		name: "Recipient directory fixture",
		samples: true,
	});
	const initial = await owner.query(api.message_recipients.directory, {});
	assert(initial.recipients.length > 0);
	assert(initial.recipients.some((entry) => entry.id === "person:jamie"));
	const parent = await fixture("Recipient parent");
	await parent.mutation(api.club.requestToJoin, { clubCode: clubId });
	const request = (
		await owner.query(api.club.current, { screen: "settings" })
	)?.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const linked = await owner.query(api.message_recipients.directory, {});
	assert(linked.recipients.some((entry) => entry.name === "Jamie Rivera"));
	const recipient = (
		await owner.query(api.club.current, { screen: "messages" })
	)?.accounts.find((entry) => entry.name === "Recipient parent");
	assert(recipient);
	await owner.mutation(api.moderation.block, {
		targetId: recipient.id,
		blocked: true,
	});
	assert(
		!(await owner.query(api.message_recipients.directory, {})).recipients.some(
			(entry) => entry.id === "person:jamie",
		),
	);
	assert.equal(
		(await parent.query(api.message_recipients.directory, {})).recipients
			.length,
		0,
	);
	await owner.mutation(api.moderation.block, {
		targetId: recipient.id,
		blocked: false,
	});
	assert(
		(await owner.query(api.message_recipients.directory, {})).recipients.some(
			(entry) => entry.id === "person:jamie",
		),
	);
	await assert.rejects(
		new ConvexHttpClient(url, { logger: false }).query(
			api.message_recipients.directory,
			{},
		),
	);
	console.log(
		"Recipient directory passed: roster-only empty state, real linked household account, bidirectional block filtering, unblock and anonymous rejection. No messages sent.",
	);
} finally {
	for (const fixture of fixtures.toReversed())
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
		});
}
