import { expect, test } from "bun:test";

type PushEvent = {
	data: { json: () => unknown };
	waitUntil: (promise: Promise<void>) => void;
};
type ClickEvent = {
	notification: { data: unknown; close: () => void };
	waitUntil: (promise: Promise<void>) => void;
};

test("browser push safely displays payloads and opens approved destinations", async (): Promise<void> => {
	const result = await Bun.build({
		entrypoints: ["src/browser/push-worker.ts"],
		target: "browser",
		format: "iife",
	});
	expect(result.success).toBe(true);
	const output = result.outputs.at(0);
	if (!output) throw new Error("Worker bundle required");
	const handlers: {
		push?: (event: PushEvent) => void;
		click?: (event: ClickEvent) => void;
	} = {};
	const shown: { title: string; body: string; data: { path: string } }[] = [];
	const navigated: string[] = [];
	const focused: string[] = [];
	const opened: string[] = [];
	const pending: Promise<void>[] = [];
	const state = { existing: true, closed: 0 };
	new Function("self", await output.text())({
		location: { origin: "https://club.example.test" },
		registration: {
			showNotification: async (
				title: string,
				options: { body: string; data: { path: string } },
			): Promise<void> => {
				shown.push({ title, ...options });
			},
		},
		clients: {
			matchAll: async () =>
				state.existing
					? [
							{
								url: "https://club.example.test/club",
								navigate: async (url: string): Promise<void> => {
									navigated.push(url);
								},
								focus: async (): Promise<void> => {
									focused.push("app");
								},
							},
						]
					: [],
			openWindow: async (url: string): Promise<void> => {
				opened.push(url);
			},
		},
		addEventListener: (
			type: "push" | "notificationclick",
			handler: ((event: PushEvent) => void) & ((event: ClickEvent) => void),
		): void => {
			if (type === "push") handlers.push = handler;
			else handlers.click = handler;
		},
	});
	const waitUntil = (promise: Promise<void>): void => {
		pending.push(promise);
	};
	handlers.push?.({
		data: {
			json: () => ({
				title: "UWH Club",
				body: "Registration is open.",
				path: "/session?event=series~2026-11-05",
			}),
		},
		waitUntil,
	});
	handlers.push?.({
		data: {
			json: () => ({
				title: "Unsafe",
				body: "Unsafe",
				path: "https://evil.example.test",
			}),
		},
		waitUntil,
	});
	handlers.push?.({
		data: {
			json: () => {
				throw new Error("Invalid JSON");
			},
		},
		waitUntil,
	});
	await Promise.all(pending);
	expect(shown.at(0)?.data.path).toBe("/session?event=series~2026-11-05");
	expect(shown.slice(1).map((value) => value.title)).toEqual([
		"UWH Club",
		"UWH Club",
	]);
	const click = async (path: string): Promise<void> => {
		handlers.click?.({
			notification: {
				data: { path },
				close: (): void => {
					state.closed += 1;
				},
			},
			waitUntil,
		});
		await Promise.all(pending);
	};
	await click("/member?id=player-1&tab=goals");
	expect(navigated).toEqual([
		"https://club.example.test/member?id=player-1&tab=goals",
	]);
	expect(focused).toEqual(["app"]);
	expect(opened).toHaveLength(0);
	state.existing = false;
	await click("/messages?tab=notices");
	await click("//evil.example.test");
	expect(opened).toEqual([
		"https://club.example.test/announcements",
		"https://club.example.test/club",
	]);
	expect(state.closed).toBe(3);
});
