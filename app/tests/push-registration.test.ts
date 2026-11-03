import { expect, test } from "bun:test";
import {
	type PushRegistration,
	pushRegistrationPlan,
} from "../convex/push_registration";

const registration: PushRegistration = {
	installationId: "fixture-installation-0001",
	userId: "fixture-user",
	sessionId: "fixture-session",
	token: "ExpoPushToken[fixture-token]",
	platform: "ios",
};
const device = {
	...registration,
	_id: "fixture-device",
	updatedAt: 1,
};

test("identical push registration is a true no-op regardless of registration age", (): void => {
	const plans = Array.from({ length: 100 }, () =>
		pushRegistrationPlan([device, device], registration),
	);
	expect(
		plans.every(
			(plan) => plan.existingId === device._id && plan.removeIds.length === 0,
		),
	).toBe(true);
	expect(device.updatedAt).toBe(1);
});

test("registration replaces rotated tokens, changed sessions, changed ownership and platform", (): void => {
	for (const change of [
		{ token: "ExpoPushToken[rotated-token]" },
		{ sessionId: "new-session" },
		{ userId: "new-user" },
		{ platform: "android" as const },
		{ installationId: "new-installation-0001" },
	]) {
		const plan = pushRegistrationPlan([device], { ...registration, ...change });
		expect(plan.existingId).toBeUndefined();
		expect(plan.removeIds).toEqual([device._id]);
	}
});

test("duplicate rows are removed once while one exact registration is retained", (): void => {
	const duplicate = { ...device, _id: "duplicate-device" };
	const staleSession = {
		...device,
		_id: "stale-session-device",
		sessionId: "stale-session",
	};
	const tokenOnOtherInstallation = {
		...device,
		_id: "other-installation-device",
		installationId: "other-installation-0001",
	};
	const plan = pushRegistrationPlan(
		[device, duplicate, staleSession, duplicate, tokenOnOtherInstallation],
		registration,
	);
	expect(plan.existingId).toBe(device._id);
	expect(plan.removeIds).toEqual([
		duplicate._id,
		staleSession._id,
		tokenOnOtherInstallation._id,
	]);
});

test("a token on another installation or user is not reused as an existing authorized registration", (): void => {
	const previousOwner = {
		...device,
		userId: "previous-user",
		_id: "previous-device",
	};
	const otherInstallation = {
		...device,
		installationId: "another-installation",
		_id: "another-device",
	};
	const plan = pushRegistrationPlan(
		[previousOwner, otherInstallation],
		registration,
	);
	expect(plan.existingId).toBeUndefined();
	expect(plan.removeIds).toEqual([previousOwner._id, otherInstallation._id]);
});

test("first registration inserts without deleting unrelated records", (): void => {
	expect(pushRegistrationPlan([], registration)).toEqual({
		existingId: undefined,
		removeIds: [],
	});
});
