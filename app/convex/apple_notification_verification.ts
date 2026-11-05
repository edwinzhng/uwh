import { type JWTVerifyGetKey, jwtVerify } from "jose";
import {
	type AppleNotification,
	parseAppleNotification,
} from "../src/domain/apple-notification";

export const verifyAppleNotification = async (
	body: string,
	clientId: string,
	keys: JWTVerifyGetKey,
	now = Date.now(),
): Promise<AppleNotification> => {
	const envelope: unknown = JSON.parse(body);
	if (
		typeof envelope !== "object" ||
		envelope === null ||
		!("payload" in envelope) ||
		typeof envelope.payload !== "string"
	)
		throw new Error("Invalid Apple notification.");
	const { payload } = await jwtVerify(envelope.payload, keys, {
		issuer: "https://appleid.apple.com",
		audience: [clientId, "com.uwhclub.app"],
		algorithms: ["RS256"],
		maxTokenAge: "7d",
		currentDate: new Date(now),
	});
	return parseAppleNotification(payload.jti, payload.events, now);
};
