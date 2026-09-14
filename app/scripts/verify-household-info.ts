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
	const email = `participants-${crypto.randomUUID()}@example.test`;
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
try {
	const owner = await fixture("Household owner");
	await owner.client.mutation(api.club.create, {
		name: "Household fixture",
		samples: true,
	});
	const before = await owner.client.query(api.club.current, {});
	assert(before);
	await owner.client.mutation(api.account.updateHouseholdInfo, {
		personId: before.account.personId,
		name: "Updated owner",
	});
	assert.equal(
		(await owner.client.query(api.account.current, {}))?.name,
		"Updated owner",
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: before.account.id,
		children: ["sam"],
		coachPrograms: before.account.coachPrograms,
		admin: before.account.admin,
	});
	await owner.client.mutation(api.account.updateHouseholdInfo, {
		personId: "sam",
		name: "Updated child",
	});
	const after = await owner.client.query(api.club.current, {});
	assert.equal(after?.account.admin, before.account.admin);
	assert.deepEqual(after?.account.coachPrograms, before.account.coachPrograms);
	await assert.rejects(
		owner.client.mutation(api.account.updateHouseholdInfo, {
			personId: "casey",
			name: "Forbidden",
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.account.updateHouseholdInfo, {
			personId: "sam",
			name: "  ",
		}),
	);
	const anonymous = new ConvexHttpClient(url, { logger: false });
	await assert.rejects(
		anonymous.mutation(api.account.updateHouseholdInfo, {
			personId: "sam",
			name: "Forbidden",
		}),
	);
	console.log(
		"Household checks passed: self and linked child update, account name synchronization, unchanged roles, unrelated and anonymous edits denied, empty name rejected.",
	);
} finally {
	for (const fixture of fixtures.toReversed())
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
		});
}
