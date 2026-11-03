import { expect, test } from "bun:test";
import { createPushRegistrationController } from "../src/backend/push-registration";

type Token = { type: string; data: string };
type Registration = {
	installationId: string;
	token: string;
	platform: "ios" | "android";
};
const token: Token = { type: "ios", data: "native-device-token" };
const registration: Registration = {
	installationId: "fixture-installation-0001",
	token: "ExpoPushToken[fixture-token]",
	platform: "ios",
};

test("native token events during acquisition are coalesced without a registration loop", async (): Promise<void> => {
	const reads: (Token | undefined)[] = [];
	const writes: (typeof registration)[] = [];
	const controller = createPushRegistrationController<Token>({
		read: async (value) => {
			reads.push(value);
			if (!value)
				for (const _ of Array.from({ length: 100 }))
					void controller.refresh(token);
			return registration;
		},
		register: async (value): Promise<void> => {
			writes.push(value);
		},
		unregister: async (): Promise<void> => {},
	});
	await controller.refresh();
	await controller.refresh(token);
	expect(reads).toEqual([undefined, token]);
	expect(writes).toEqual([registration]);
	controller.stop();
});

test("rotated native tokens are forwarded instead of reacquired", async (): Promise<void> => {
	const reads: (Token | undefined)[] = [];
	const writes: string[] = [];
	const controller = createPushRegistrationController<Token>({
		read: async (value) => {
			reads.push(value);
			return { ...registration, token: value?.data ?? registration.token };
		},
		register: async (value): Promise<void> => {
			writes.push(value.token);
		},
		unregister: async (): Promise<void> => {},
	});
	await controller.refresh(token);
	const rotated = { ...token, data: "rotated-device-token" };
	await controller.refresh(rotated);
	await controller.refresh(rotated);
	expect(reads).toEqual([token, rotated]);
	expect(writes).toEqual([token.data, rotated.data]);
	controller.stop();
});

test("the newest callback wins when a token rotates back during an in-flight exchange", async (): Promise<void> => {
	const rotated = { ...token, data: "rotated-device-token" };
	const pending: { finish?: () => void } = {};
	const writes: string[] = [];
	const controller = createPushRegistrationController<Token>({
		read: async (value) => {
			if (value?.data === rotated.data)
				await new Promise<void>((resolve) => {
					pending.finish = resolve;
				});
			return { ...registration, token: value?.data ?? registration.token };
		},
		register: async (value): Promise<void> => {
			writes.push(value.token);
		},
		unregister: async (): Promise<void> => {},
	});
	await controller.refresh(token);
	const exchange = controller.refresh(rotated);
	await Promise.resolve();
	void controller.refresh(token);
	pending.finish?.();
	await exchange;
	await controller.refresh(token);
	expect(writes).toEqual([token.data, rotated.data, token.data]);
	controller.stop();
});

test("teardown before the deferred acquisition starts performs no native work", async (): Promise<void> => {
	const calls: string[] = [];
	const controller = createPushRegistrationController<Token>({
		read: async () => {
			calls.push("read");
			return registration;
		},
		register: async (): Promise<void> => {
			calls.push("register");
		},
		unregister: async (): Promise<void> => {
			calls.push("unregister");
		},
	});
	const exchange = controller.refresh(token);
	controller.stop();
	await exchange;
	expect(calls).toEqual([]);
});

test("failed registration can retry and stopped work cannot write", async (): Promise<void> => {
	const attempts: string[] = [];
	const controller = createPushRegistrationController<Token>({
		read: async () => registration,
		register: async (value): Promise<void> => {
			attempts.push(value.token);
			if (attempts.length === 1) throw new Error("Connection unavailable");
		},
		unregister: async (): Promise<void> => {},
	});
	await expect(controller.refresh(token)).rejects.toThrow(
		"Connection unavailable",
	);
	await controller.refresh(token);
	expect(attempts).toHaveLength(2);
	controller.stop();
	await controller.refresh({ ...token, data: "after-stop" });
	expect(attempts).toHaveLength(2);
	const pending: { finish?: () => void } = {};
	const stopped = createPushRegistrationController<Token>({
		read: async () => {
			await new Promise<void>((resolve) => {
				pending.finish = resolve;
			});
			return registration;
		},
		register: async (value): Promise<void> => {
			attempts.push(value.token);
		},
		unregister: async (): Promise<void> => {},
	});
	const refresh = stopped.refresh(token);
	await Promise.resolve();
	stopped.stop();
	pending.finish?.();
	await refresh;
	expect(attempts).toHaveLength(2);
});

test("foreground refresh only unregisters once and can subsequently re-enable", async (): Promise<void> => {
	const state = { enabled: false, writes: 0, removals: 0 };
	const controller = createPushRegistrationController<Token>({
		read: async () => (state.enabled ? registration : undefined),
		register: async (): Promise<void> => {
			state.writes += 1;
		},
		unregister: async (): Promise<void> => {
			state.removals += 1;
		},
	});
	await controller.refresh();
	await controller.refresh();
	expect(state.removals).toBe(1);
	state.enabled = true;
	await controller.refresh();
	await controller.refresh();
	expect(state.writes).toBe(1);
	controller.stop();
});

test("push bridge forwards emitted tokens and does not restart on route changes", async (): Promise<void> => {
	const native = await Bun.file("src/backend/native-push.ts").text();
	const bridge = await Bun.file("src/backend/push-bridge.tsx").text();
	expect(native).toContain("devicePushToken,");
	expect(native).toContain("addPushTokenListener(refresh)");
	expect(bridge).toContain("registerNativePush(false, token)");
	expect(bridge).toContain("[register, unregister, account.id]");
});

test("a foreground permission refresh during acquisition is not dropped", async (): Promise<void> => {
	const pending: { finish?: () => void } = {};
	const state = { enabled: true, reads: 0, writes: 0, removals: 0 };
	const controller = createPushRegistrationController<Token>({
		read: async () => {
			state.reads += 1;
			const enabled = state.enabled;
			if (state.reads === 1)
				await new Promise<void>((resolve) => {
					pending.finish = resolve;
				});
			return enabled ? registration : undefined;
		},
		register: async (): Promise<void> => {
			state.writes += 1;
		},
		unregister: async (): Promise<void> => {
			state.removals += 1;
		},
	});
	const first = controller.refresh();
	await Promise.resolve();
	state.enabled = false;
	void controller.refresh();
	pending.finish?.();
	await first;
	expect(state).toEqual({ enabled: false, reads: 2, writes: 1, removals: 1 });
	controller.stop();
});

test("a stopped controller resumes registration after a failed logout cleanup", async (): Promise<void> => {
	const state = { writes: 0 };
	const controller = createPushRegistrationController<
		never,
		typeof registration
	>({
		read: async () => registration,
		register: async (): Promise<void> => {
			state.writes += 1;
		},
		unregister: async (): Promise<void> => {},
	});
	await controller.refresh();
	controller.stop();
	await controller.refresh();
	expect(state.writes).toBe(1);
	await controller.resume();
	expect(state.writes).toBe(2);
	controller.stop();
});

test("resuming while an old registration finishes still restores the server registration", async (): Promise<void> => {
	const pending: { finish?: () => void } = {};
	const state = { writes: 0 };
	const controller = createPushRegistrationController<
		never,
		typeof registration
	>({
		read: async () => registration,
		register: async (): Promise<void> => {
			state.writes += 1;
			if (state.writes === 1)
				await new Promise<void>((resolve) => {
					pending.finish = resolve;
				});
		},
		unregister: async (): Promise<void> => {},
	});
	const first = controller.refresh();
	await Promise.resolve();
	await Promise.resolve();
	controller.stop();
	const resumed = controller.resume();
	pending.finish?.();
	await Promise.all([first, resumed]);
	expect(state.writes).toBe(2);
	controller.stop();
});
