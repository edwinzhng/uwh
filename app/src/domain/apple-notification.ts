export type AppleNotification = {
	key: string;
	subject: string;
	type:
		| "email-enabled"
		| "email-disabled"
		| "consent-revoked"
		| "account-delete";
	eventAt: number;
};

export const parseAppleNotification = (
	key: string | undefined,
	events: unknown,
	now: number,
): AppleNotification => {
	if (
		!key ||
		key.length > 200 ||
		typeof events !== "string" ||
		events.length > 10000
	)
		throw new Error("Invalid Apple notification.");
	const event: unknown = JSON.parse(events);
	if (
		typeof event !== "object" ||
		event === null ||
		!("sub" in event) ||
		typeof event.sub !== "string" ||
		!event.sub ||
		event.sub.length > 512 ||
		!("type" in event) ||
		!(
			event.type === "email-enabled" ||
			event.type === "email-disabled" ||
			event.type === "consent-revoked" ||
			event.type === "account-delete"
		) ||
		!("event_time" in event) ||
		typeof event.event_time !== "number" ||
		!Number.isSafeInteger(event.event_time) ||
		event.event_time <= 0 ||
		event.event_time * 1000 > now + 300000
	)
		throw new Error("Invalid Apple notification.");
	return {
		key,
		subject: event.sub,
		type: event.type,
		eventAt: event.event_time * 1000,
	};
};
