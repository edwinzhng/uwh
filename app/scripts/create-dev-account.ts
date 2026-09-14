import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("The demo login is only for the isolated local backend.");

const email = "demo@example.test";
const password = "CrocsClub2026!";
const client = new ConvexHttpClient(url, { logger: false });
const result = await client
	.action(api.auth.signIn, {
		provider: "password",
		params: { flow: "signIn", email, password },
	})
	.catch(
		(error: unknown): Promise<FunctionReturnType<typeof api.auth.signIn>> => {
			if (
				!(error instanceof Error) ||
				!error.message.includes("InvalidAccountId")
			)
				throw error;
			return signInVerified(client, {
				provider: "password",
				params: { flow: "signUp", name: "Alex Rivera", email, password },
			});
		},
	);
assert(result.tokens, "The demo login needs email verification.");
client.setAuth(result.tokens.token);
if (!(await client.query(api.club.current, { screen: "schedule" })))
	await client.mutation(api.club.create, {
		name: "Calgary Crocs · Demo",
		samples: true,
	});

const fresh = new ConvexHttpClient(url, { logger: false });
const login = await fresh.action(api.auth.signIn, {
	provider: "password",
	params: { flow: "signIn", email, password },
});
assert(login.tokens, "The demo login was not verified.");
fresh.setAuth(login.tokens.token);
const workspace = await fresh.query(api.club.current, { screen: "schedule" });
assert(workspace, "The demo club is unavailable.");
assert(workspace.account.admin && workspace.account.coachPrograms.length > 0);
assert.deepEqual(workspace.account.children, ["sam", "mila"]);
assert(
	workspace.data.members.some(
		(person) =>
			person.id === workspace.account.personId && person.programs.length > 0,
	),
);
await fresh.action(api.auth.signOut, {});
await client.action(api.auth.signOut, {});
console.log("Verified local demo login ready: demo@example.test");
console.log(
	"Player, parent, coach and admin access; Sam and Mila are linked profiles.",
);
