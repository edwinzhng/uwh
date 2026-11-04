import { expect, test } from "bun:test";
import { screenWorkspace } from "../src/backend/screen-workspace";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { homeNextPractice } from "../src/domain/home-summary";

const dispatch = (): Promise<boolean> => Promise.resolve(true);
const scope = {
	workspaceId: "club-a",
	accountId: primaryAccount.id,
	dispatch,
};
const home = {
	clubId: "club-a",
	data: initialAppData,
	account: primaryAccount,
	accounts: [primaryAccount],
};

test("retained Home keeps the next practice when the active workspace is Chats or a detail page", (): void => {
	const now = Date.parse("2026-09-09T12:00:00Z");
	for (const activeData of [
		initialAppData,
		{ ...initialAppData, events: [], responses: [] },
		{
			...initialAppData,
			events: initialAppData.events.filter((event) => event.id === "past"),
		},
	]) {
		const active = { ...scope, data: activeData, loading: true };
		const retained = screenWorkspace(active, home);
		expect(retained?.loading).toBe(false);
		expect(retained?.data).toBe(initialAppData);
		expect(
			retained && homeNextPractice(retained.data, retained.account, now)?.id,
		).toBe("club-thu");
	}
});

test("Home waits for its own workspace and accepts an actually empty schedule", (): void => {
	expect(screenWorkspace(scope, undefined)).toBeUndefined();
	expect(screenWorkspace(scope, null)).toBeUndefined();
	const empty = screenWorkspace(scope, {
		...home,
		data: { ...initialAppData, events: [] },
	});
	expect(empty?.loading).toBe(false);
	expect(empty?.data.events).toEqual([]);
});

test("late workspace results cannot leak between clubs or signed-in accounts", (): void => {
	expect(
		screenWorkspace({ ...scope, workspaceId: "club-b" }, home),
	).toBeUndefined();
	expect(
		screenWorkspace({ ...scope, accountId: "other-account" }, home),
	).toBeUndefined();
	expect(
		screenWorkspace({ ...scope, workspaceId: undefined }, home),
	).toBeUndefined();
});
