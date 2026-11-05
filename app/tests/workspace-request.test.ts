import { expect, test } from "bun:test";
import { workspaceRequest } from "../src/backend/workspace-request";

test("retained detail screens use their own entity instead of the globally active route", () => {
	expect(
		workspaceRequest("session", {
			event: "practice-a",
			id: "legacy",
			tab: "coaching",
		}),
	).toEqual({ screen: "session", id: "practice-a" });
	expect(workspaceRequest("session", { id: "legacy" })).toEqual({
		screen: "session",
		id: "legacy",
	});
	expect(workspaceRequest("member", { id: "player-a" }, "player-b")).toEqual({
		screen: "member",
		id: "player-a",
	});
	expect(workspaceRequest("account", {}, "player-b")).toEqual({
		screen: "account",
		id: "player-b",
	});
	expect(
		workspaceRequest("resources", { id: "video-a", person: "player-a" }),
	).toEqual({ screen: "resources", id: "player-a" });
	expect(workspaceRequest("fitness", { person: ["player-a"] })).toEqual({
		screen: "fitness",
		id: "player-a",
	});
});
test("filters and tabs reuse a workspace while profile changes remain isolated", () => {
	expect(
		workspaceRequest("members", { tab: "matchmaking", search: "Jordan" }),
	).toEqual(workspaceRequest("members", {}));
	expect(workspaceRequest("account", { tab: "feedback" }, "one")).toEqual(
		workspaceRequest("account", { tab: "fitness" }, "one"),
	);
	expect(workspaceRequest("progress", {}, "one")).toEqual({
		screen: "member",
		id: "one",
	});
	expect(workspaceRequest("my-progress", { id: "two" }, "one")).toEqual({
		screen: "member",
		id: "two",
	});
	expect(
		workspaceRequest("session", { event: { id: "bad" } }).id,
	).toBeUndefined();
});
