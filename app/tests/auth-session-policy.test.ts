import { expect, test } from "bun:test";
import { authSessionPolicy } from "../src/domain/auth-session-policy";

test("sessions allow one year overall and expire after ninety inactive days", (): void => {
	const day = 24 * 60 * 60 * 1000;
	expect(authSessionPolicy.totalDurationMs).toBe(365 * day);
	expect(authSessionPolicy.inactiveDurationMs).toBe(90 * day);
	expect(authSessionPolicy.inactiveDurationMs).toBeLessThan(
		authSessionPolicy.totalDurationMs,
	);
});
