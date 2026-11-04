import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
const site = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (url !== "http://127.0.0.1:3210" || site !== "http://127.0.0.1:3211")
	throw new Error("Local backend only.");
const verification = createVerificationRun("youtube");
try {
	const owner = await verification.fixture("YouTube verification owner");
	await owner.client.mutation(api.club.create, {
		name: "YouTube verification",
		samples: false,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club?.inviteCode);
	const member = await verification.fixture("YouTube verification member");
	await member.client.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const signedOut = new ConvexHttpClient(url, { logger: false });
	await assert.rejects(signedOut.query(api.youtube.status, {}));
	await assert.rejects(member.client.query(api.youtube.status, {}));
	await assert.rejects(member.client.action(api.youtube_actions.authorize, {}));
	const status = await owner.client.query(api.youtube.status, {});
	assert.equal(status.channelName, undefined);
	assert.equal("refreshToken" in status, false);
	const draft = {
		key: crypto.randomUUID(),
		name: "coaching.mp4",
		mime: "video/mp4",
		size: 1000,
	};
	await assert.rejects(member.client.mutation(api.youtube.reserve, draft));
	await assert.rejects(
		owner.client.mutation(api.youtube.reserve, { ...draft, size: 2 ** 31 }),
	);
	await assert.rejects(
		owner.client.mutation(api.youtube.reserve, {
			...draft,
			mime: "application/pdf",
		}),
	);
	await assert.rejects(owner.client.mutation(api.youtube.reserve, draft));
	const rejected = await fetch(`${site}/youtube/upload?id=not-an-upload`, {
		method: "POST",
		body: "video",
	});
	assert.equal(rejected.status, 401);
	assert.equal((await rejected.json()).error.includes("Sign in"), true);
	const callback = await fetch(
		`${site}/youtube/callback?state=invalid&code=invalid`,
	);
	assert.equal(callback.status, 400);
	assert.equal((await callback.text()).includes("Return to the app"), true);
	console.log(
		"YouTube local checks passed: signed-out/member access, safe connection status, media limits, missing channel, invalid upload and OAuth callback rejection. No Google requests or uploads were made.",
	);
} finally {
	await verification.close();
}
