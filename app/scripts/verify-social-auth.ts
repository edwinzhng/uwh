import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type {
	AccountConnectionPurpose,
	SocialProvider,
} from "../src/domain/social-auth";
import { localRun } from "./local-checks";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
type Fixture = {
	userId: Id<"users">;
	email: string;
	client: ConvexHttpClient;
	sessionId: Id<"authSessions">;
	token: string;
	password?: string;
	subject?: string;
};
const cleanup: { userId: Id<"users">; email: string }[] = [];
const session = async (
	userId: Id<"users">,
	email: string,
): Promise<Fixture> => {
	const proof = await localRun(
		"local_social:session",
		internal.local_social.session,
		{ userId, email },
	);
	const client = new ConvexHttpClient(url, { logger: false });
	client.setAuth(proof.token);
	return { userId, email, client, ...proof };
};
const passwordUser = async (): Promise<Fixture> => {
	const email = `social-password-${crypto.randomUUID()}@example.test`;
	const password = `${crypto.randomUUID()}Aa!`;
	const client = new ConvexHttpClient(url, { logger: false });
	const result = await signInVerified(client, {
		provider: "password",
		params: { flow: "signUp", email, password, name: "Original name" },
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	const account = await client.query(api.account.current, {});
	assert(account?.hasPassword);
	cleanup.push({ userId: account.id, email });
	return { ...(await session(account.id, email)), password };
};
const socialUser = async (provider: SocialProvider): Promise<Fixture> => {
	const email = `social-${crypto.randomUUID()}@example.test`;
	const subject = crypto.randomUUID();
	const userId = await localRun(
		"local_social:provision",
		internal.local_social.provision,
		{ email, subject, provider, name: "Provider name", verified: true },
	);
	cleanup.push({ userId, email });
	return { ...(await session(userId, email)), subject };
};
const request = (
	owner: Fixture,
	provider: SocialProvider,
	purpose: AccountConnectionPurpose = "link",
	expired = false,
): Promise<Id<"accountConnections">> =>
	localRun("local_social:request", internal.local_social.request, {
		userId: owner.userId,
		sessionId: owner.sessionId,
		provider,
		purpose,
		expired,
	});

try {
	const publicClient = new ConvexHttpClient(url, { logger: false });
	const availability = await publicClient.query(
		api.connected_accounts.list,
		{},
	);
	assert.deepEqual(availability.accounts, []);
	await assert.rejects(
		publicClient.mutation(api.connected_accounts.begin, {
			provider: "google",
			purpose: "link",
		}),
	);
	const owner = await passwordUser();
	const club = await owner.client.mutation(api.club.create, {
		name: "Social auth test club",
		samples: true,
	});
	const before = await owner.client.query(api.club.current, {});
	assert(before);
	const google = await socialUser("google");
	const linking = await request(owner, "google");
	await assert.rejects(
		owner.client.action(api.connection_actions.complete, {
			requestId: linking,
			token: google.token,
		}),
		/Verify your sign-in/,
	);
	const proof = await session(google.userId, google.email);
	await assert.rejects(
		owner.client.action(api.connection_actions.complete, {
			requestId: linking,
			token: "invalid",
		}),
	);
	await assert.rejects(
		google.client.action(api.connection_actions.complete, {
			requestId: linking,
			token: proof.token,
		}),
		/Connection expired/,
	);
	const otherOwnerSession = await session(owner.userId, owner.email);
	await assert.rejects(
		otherOwnerSession.client.action(api.connection_actions.complete, {
			requestId: linking,
			token: proof.token,
		}),
		/Connection expired/,
	);
	await owner.client.action(api.connection_actions.complete, {
		requestId: linking,
		token: proof.token,
	});
	assert.deepEqual(
		await owner.client.query(api.connected_accounts.result, {
			requestId: linking,
		}),
		{ purpose: "link", complete: true },
	);
	assert.equal(
		await publicClient.query(api.connected_accounts.result, {
			requestId: linking,
		}),
		null,
	);
	await owner.client.action(api.connection_actions.complete, {
		requestId: linking,
		token: proof.token,
	});
	const after = await owner.client.query(api.club.current, {});
	assert.deepEqual(after?.account, before.account);
	assert.deepEqual(after?.data, before.data);
	assert.equal(after?.clubId, club);
	assert.equal(
		(await owner.client.query(api.account.current, {}))?.email,
		owner.email,
	);
	assert.equal(await google.client.query(api.account.current, {}), null);
	const methods = await owner.client.query(api.connected_accounts.list, {});
	const googleMethod = methods.accounts.find(
		(account) => account.provider === "google",
	);
	assert(googleMethod?.canDisconnect);
	assert.equal(googleMethod.email, google.email);
	const returning = await localRun(
		"local_social:provision",
		internal.local_social.provision,
		{
			email: google.email,
			subject: google.subject ?? "",
			provider: "google",
			name: "Changed Google name",
			verified: true,
		},
	);
	assert.equal(returning, owner.userId);
	assert.equal(
		(await owner.client.query(api.account.current, {}))?.name,
		"Original name",
	);
	assert.equal(
		(await owner.client.query(api.account.current, {}))?.email,
		owner.email,
	);
	const aliasInvite = await owner.client.mutation(api.invites.create, {
		email: google.email,
		profile: {
			id: crypto.randomUUID(),
			name: "Alias invite",
			player: true,
			charge: 0,
		},
	});
	assert.equal(
		(
			await owner.client.query(api.invites.preview, {
				invite: aliasInvite,
				revision: 1,
			})
		)?.matchesEmail,
		true,
	);
	await owner.client.mutation(api.connected_accounts.disconnect, {
		accountId: googleMethod.id,
	});
	assert.equal(
		(
			await owner.client.query(api.invites.preview, {
				invite: aliasInvite,
				revision: 1,
			})
		)?.matchesEmail,
		false,
	);
	assert.equal(
		(await owner.client.query(api.connected_accounts.list, {})).accounts.length,
		1,
	);
	assert.equal(
		await otherOwnerSession.client.query(api.account.current, {}),
		null,
	);
	const sameEmail = await localRun(
		"local_social:provision",
		internal.local_social.provision,
		{
			email: owner.email,
			subject: crypto.randomUUID(),
			provider: "google",
			name: "OAuth name",
			verified: true,
		},
	);
	assert.equal(sameEmail, owner.userId);
	assert.equal(
		(await owner.client.query(api.account.current, {}))?.name,
		"Original name",
	);
	await assert.rejects(
		localRun("local_social:provision", internal.local_social.provision, {
			email: owner.email,
			subject: crypto.randomUUID(),
			provider: "apple",
			name: "Unverified",
			verified: false,
		}),
		/Verify your email/,
	);
	const apple = await socialUser("apple");
	const appleMethod = (
		await apple.client.query(api.connected_accounts.list, {})
	).accounts.at(0);
	assert(appleMethod && !appleMethod.canDisconnect);
	assert.equal(
		(await apple.client.query(api.account.current, {}))?.hasPassword,
		false,
	);
	await assert.rejects(
		apple.client.mutation(api.connected_accounts.disconnect, {
			accountId: appleMethod.id,
		}),
		/at least one/,
	);
	await assert.rejects(
		owner.client.mutation(api.connected_accounts.disconnect, {
			accountId: appleMethod.id,
		}),
		/unavailable/,
	);
	await assert.rejects(
		apple.client.action(api.account_actions.deleteAccount, {}),
		/Verify your identity/,
	);
	const expired = await request(owner, "apple", "link", true);
	const appleProof = await session(apple.userId, apple.email);
	await assert.rejects(
		owner.client.action(api.connection_actions.complete, {
			requestId: expired,
			token: appleProof.token,
		}),
		/Connection expired/,
	);
	const occupied = await socialUser("apple");
	await occupied.client.mutation(api.club.create, {
		name: "Separate account club",
		samples: false,
	});
	const conflict = await request(owner, "apple");
	const occupiedProof = await session(occupied.userId, occupied.email);
	await assert.rejects(
		owner.client.action(api.connection_actions.complete, {
			requestId: conflict,
			token: occupiedProof.token,
		}),
		/another club account/,
	);
	assert.equal(
		(await occupied.client.query(api.account.current, {}))?.id,
		occupied.userId,
	);
	const verification = await request(apple, "apple", "verify");
	const wrongProof = await session(occupied.userId, occupied.email);
	await assert.rejects(
		apple.client.action(api.connection_actions.complete, {
			requestId: verification,
			token: wrongProof.token,
		}),
		/already connected/,
	);
	const validProof = await session(apple.userId, apple.email);
	await apple.client.action(api.connection_actions.complete, {
		requestId: verification,
		token: validProof.token,
	});
	assert.equal(
		(await apple.client.query(api.connected_accounts.list, {})).reauthenticated,
		true,
	);
	await apple.client.action(api.account_actions.deleteAccount, {});
	assert.equal(await apple.client.query(api.account.current, {}), null);
	console.log(
		"Social auth checks passed: verified email linking, different-email connections, preserved club data, wrong-session and stale-proof rejection, last-method protection, conflict isolation, session revocation and password-free account deletion. Provider browser handshakes require configured credentials.",
	);
} finally {
	for (const fixture of cleanup)
		await localRun(
			"local_social:remove",
			internal.local_social.remove,
			fixture,
		);
}
