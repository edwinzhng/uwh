import { expect, test } from "bun:test";
import { createInstallationReader } from "../src/backend/push-installation";
import {
	signOutAfterPushCleanup,
	trackPushLifecycle,
} from "../src/backend/push-lifecycle";
import { canUnregisterInstallation } from "../src/domain/push-installation-ownership";

test("logout stops registration and completes cleanup before revoking authentication", async (): Promise<void> => {
	const calls: string[] = [];
	const release = trackPushLifecycle(
		(): void => {
			calls.push("stop");
		},
		async (): Promise<void> => {
			calls.push("resume");
		},
	);
	await signOutAfterPushCleanup({
		cleanup: async (): Promise<void> => {
			calls.push("unregister");
		},
		signOut: async (): Promise<void> => {
			calls.push("signOut");
		},
	});
	expect(calls).toEqual(["stop", "unregister", "signOut"]);
	release();
});
test("offline cleanup cannot block signout or unregister after a delayed installation lookup", async (): Promise<void> => {
	const pending: { finish?: () => void } = {};
	const calls: string[] = [];
	await signOutAfterPushCleanup({
		timeoutMs: 1,
		cleanup: async (signal): Promise<void> => {
			await new Promise<void>((resolve) => {
				pending.finish = resolve;
			});
			if (!signal.aborted) calls.push("unregister");
		},
		signOut: async (): Promise<void> => {
			calls.push("signOut");
		},
	});
	pending.finish?.();
	await Promise.resolve();
	expect(calls).toEqual(["signOut"]);
});
test("cleanup errors do not prevent signout and a failed signout resumes only mounted controllers", async (): Promise<void> => {
	const calls: string[] = [];
	const release = trackPushLifecycle(
		(): void => {
			calls.push("stop");
		},
		async (): Promise<void> => {
			calls.push("resume");
		},
	);
	await expect(
		signOutAfterPushCleanup({
			cleanup: async (): Promise<void> => {
				throw new Error("Offline");
			},
			signOut: async (): Promise<void> => {
				throw new Error("Signout failed");
			},
		}),
	).rejects.toThrow("Signout failed");
	expect(calls).toEqual(["stop", "resume"]);
	release();
});
test("late cleanup cannot remove another authenticated account's installation", (): void => {
	expect(canUnregisterInstallation("new-user", "old-user")).toBe(false);
	expect(canUnregisterInstallation(undefined, "old-user")).toBe(false);
	expect(canUnregisterInstallation("old-user", "old-user")).toBe(true);
	expect(canUnregisterInstallation("old-user")).toBe(true);
});
test("concurrent native installation reads share one generated and persisted identity", async (): Promise<void> => {
	const state: { id?: string; creates: number; writes: number } = {
		creates: 0,
		writes: 0,
	};
	const read = createInstallationReader({
		read: async () => state.id,
		create: (): string => {
			state.creates += 1;
			return `installation-${state.creates}`;
		},
		write: async (id): Promise<void> => {
			state.writes += 1;
			state.id = id;
		},
	});
	expect(await Promise.all([read(), read(), read()])).toEqual([
		"installation-1",
		"installation-1",
		"installation-1",
	]);
	expect(await read()).toBe("installation-1");
	expect(state.creates).toBe(1);
	expect(state.writes).toBe(1);
});
