import { expect, test } from "bun:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyAppleNotification } from "../convex/apple_notification_verification";
import { parseAppleNotification } from "../src/domain/apple-notification";

test("Apple event parsing rejects unknown types, invalid subjects and future times", (): void => {
	const now = Date.now();
	const event = {
		sub: "subject",
		type: "consent-revoked",
		event_time: Math.floor(now / 1000),
	};
	expect(parseAppleNotification("event", JSON.stringify(event), now).type).toBe(
		"consent-revoked",
	);
	expect(() =>
		parseAppleNotification(
			"event",
			JSON.stringify({ ...event, type: "unknown" }),
			now,
		),
	).toThrow();
	expect(() =>
		parseAppleNotification("event", JSON.stringify({ ...event, sub: "" }), now),
	).toThrow();
	expect(() =>
		parseAppleNotification(
			"event",
			JSON.stringify({ ...event, event_time: Math.floor(now / 1000) + 600 }),
			now,
		),
	).toThrow();
	expect(() =>
		parseAppleNotification(undefined, JSON.stringify(event), now),
	).toThrow();
});

test("Apple notifications require a trusted signature, issuer, audience and fresh JWT", async (): Promise<void> => {
	const { publicKey, privateKey } = await generateKeyPair("RS256");
	const keys = createLocalJWKSet({
		keys: [{ ...(await exportJWK(publicKey)), alg: "RS256", kid: "test-key" }],
	});
	const now = Math.floor(Date.now() / 1000);
	const signed = (
		issuer: string,
		audience: string,
		issuedAt = now,
	): Promise<string> =>
		new SignJWT({
			events: JSON.stringify({
				sub: "fixture-subject",
				type: "account-delete",
				event_time: now,
			}),
		})
			.setProtectedHeader({ alg: "RS256", kid: "test-key" })
			.setIssuer(issuer)
			.setAudience(audience)
			.setIssuedAt(issuedAt)
			.setJti("event-id")
			.sign(privateKey);
	const body = (payload: string): string => JSON.stringify({ payload });
	expect(
		(
			await verifyAppleNotification(
				body(await signed("https://appleid.apple.com", "service-id")),
				"service-id",
				keys,
			)
		).subject,
	).toBe("fixture-subject");
	await expect(
		verifyAppleNotification(
			body(await signed("https://invalid.example", "service-id")),
			"service-id",
			keys,
		),
	).rejects.toThrow();
	await expect(
		verifyAppleNotification(
			body(await signed("https://appleid.apple.com", "different-service")),
			"service-id",
			keys,
		),
	).rejects.toThrow();
	await expect(
		verifyAppleNotification(
			body(
				await signed(
					"https://appleid.apple.com",
					"service-id",
					now - 8 * 86400,
				),
			),
			"service-id",
			keys,
		),
	).rejects.toThrow();
	await expect(
		verifyAppleNotification(body("forged-token"), "service-id", keys),
	).rejects.toThrow();
});
