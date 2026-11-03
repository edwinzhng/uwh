import { expect, test } from "bun:test";
import {
	base64UrlBytes,
	validateBrowserSubscription,
	validVapidPublicKey,
	webPushEndpoint,
} from "../src/domain/web-push";

test("browser push endpoint allowlist rejects credential URLs and private/custom services", (): void => {
	for (const url of [
		"http://fcm.googleapis.com/x",
		"https://127.0.0.1/x",
		"https://localhost/x",
		"https://fcm.googleapis.com.evil.test/x",
		"https://user:password@fcm.googleapis.com/x",
		"https://fcm.googleapis.com:444/x",
		"https://fcm.googleapis.com/x#secret",
		"not a URL",
	])
		expect(webPushEndpoint(url)).toBe(false);
	for (const host of [
		"fcm.googleapis.com",
		"updates.push.services.mozilla.com",
		"web.push.apple.com",
	])
		expect(webPushEndpoint(`https://${host}/push-token`)).toBe(true);
});
test("subscription validation requires a valid-sized uncompressed P-256 public key and auth secret", async (): Promise<void> => {
	const pair = await crypto.subtle.generateKey(
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		["deriveKey"],
	);
	const p256dh = Buffer.from(
		await crypto.subtle.exportKey("raw", pair.publicKey),
	).toString("base64url");
	const auth = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
		"base64url",
	);
	const subscription = {
		endpoint: "https://web.push.apple.com/fictional-test",
		keys: { p256dh, auth },
	};
	expect(validVapidPublicKey(p256dh)).toBe(true);
	expect(validateBrowserSubscription(subscription)).toBeUndefined();
	expect(
		validateBrowserSubscription({
			...subscription,
			keys: { ...subscription.keys, auth: "x" },
		}),
	).toBeDefined();
	expect(
		validateBrowserSubscription({
			...subscription,
			keys: { ...subscription.keys, p256dh: "A".repeat(87) },
		}),
	).toBeDefined();
	expect(base64UrlBytes("A")).toBeUndefined();
	expect(base64UrlBytes("!bad!")).toBeUndefined();
});
