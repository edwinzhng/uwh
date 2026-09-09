import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Equipment } from "../src/domain/app-types";
import { equipmentStock } from "../src/domain/equipment";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const password = `${crypto.randomUUID()}Aa1!`;
const result = await signInVerified(client, {
	provider: "password",
	params: {
		flow: "signUp",
		email: `equipment-${crypto.randomUUID()}@example.test`,
		password,
		name: "Equipment check",
	},
});
assert(result.tokens);
client.setAuth(result.tokens.token);
const item: Equipment = {
	id: "quantity-check",
	name: "Training fins",
	size: "Medium",
	condition: "ready",
	quantity: 2,
};
const issue = (id: string): Promise<unknown> =>
	client.mutation(api.club.apply, {
		action: {
			type: "issue",
			loan: {
				id,
				itemId: item.id,
				personId: "sam",
				due: "2026-10-01",
				returned: false,
			},
		},
	});
try {
	await client.mutation(api.club.create, {
		name: "Equipment verification",
		samples: true,
	});
	await client.mutation(api.club.apply, {
		action: { type: "add-equipment", equipment: item },
	});
	const raced = await Promise.allSettled([
		issue("one"),
		issue("two"),
		issue("three"),
	]);
	assert.equal(raced.filter((entry) => entry.status === "fulfilled").length, 2);
	assert.equal(raced.filter((entry) => entry.status === "rejected").length, 1);
	const current = await client.query(api.club.current, { screen: "equipment" });
	assert(current);
	const active = current.data.loans.filter(
		(loan) => loan.itemId === item.id && !loan.returned,
	);
	assert.equal(active.length, 2);
	assert.equal(equipmentStock(item, active).available, 0);
	await assert.rejects(
		client.mutation(api.club.apply, {
			action: { type: "update-equipment", equipment: { ...item, quantity: 1 } },
		}),
	);
	const first = active.at(0);
	assert(first);
	await client.mutation(api.club.apply, {
		action: { type: "return", loanId: first.id },
	});
	await issue("after-return");
	await client.mutation(api.club.apply, {
		action: { type: "update-equipment", equipment: { ...item, quantity: 3 } },
	});
	await issue("after-increase");
	const updated = await client.query(api.club.current, { screen: "equipment" });
	assert(updated);
	assert.equal(
		updated.data.equipment.find((entry) => entry.id === item.id)?.quantity,
		3,
	);
	assert.equal(
		equipmentStock({ ...item, quantity: 3 }, updated.data.loans).onLoan,
		3,
	);
	console.log(
		"Live equipment verified: concurrent capacity, quantity edits, returns, and persistence.",
	);
} finally {
	await client.action(api.account_actions.deleteAccount, { password });
}
