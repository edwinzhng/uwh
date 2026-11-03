import { expect, test } from "bun:test";
import { pushOutcome } from "../convex/push_outcome";

test("receipt rate limiting retries delivery while permanent errors stop", () => {
	for (const phase of ["ticket", "receipt"] as const) {
		expect(
			pushOutcome(phase, {
				status: "error",
				details: { error: "MessageRateExceeded" },
			}),
		).toEqual({ error: "MessageRateExceeded", retry: true });
		for (const error of [
			"DeviceNotRegistered",
			"MessageTooBig",
			"MismatchSenderId",
			"InvalidCredentials",
		])
			expect(
				pushOutcome(phase, { status: "error", details: { error } }),
			).toEqual({ error, retry: false });
	}
});
test("tickets schedule receipts and successful receipts confirm provider handoff", () => {
	expect(pushOutcome("ticket", { status: "ok", id: "ticket" })).toEqual({
		ticketId: "ticket",
		retry: false,
	});
	expect(pushOutcome("receipt", { status: "ok" })).toEqual({
		delivered: true,
		retry: false,
	});
	expect(pushOutcome("ticket", undefined)).toEqual({
		error: "DeliveryUnavailable",
		retry: true,
	});
	expect(pushOutcome("ticket", { status: "ok" })).toEqual({
		error: "DeliveryUnavailable",
		retry: true,
	});
});
