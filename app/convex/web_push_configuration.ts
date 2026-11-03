import { validVapidPublicKey } from "../src/domain/web-push";

export const webPushConfiguration = (): {
	configured: boolean;
	publicKey?: string;
	reason?: string;
} => {
	const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
	const configured = Boolean(
		process.env.OUTBOUND_DELIVERY_DISABLED !== "true" &&
			process.env.WEB_PUSH_DELIVERY_ENABLED === "true" &&
			publicKey &&
			validVapidPublicKey(publicKey) &&
			/^[A-Za-z0-9_-]{43}$/.test(
				process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
			) &&
			/^(mailto:|https:\/\/)/.test(process.env.WEB_PUSH_VAPID_SUBJECT ?? ""),
	);
	return configured
		? { configured, publicKey }
		: {
				configured: false,
				reason:
					"Browser push is not configured by the club's app administrator. The activity inbox still works.",
			};
};
