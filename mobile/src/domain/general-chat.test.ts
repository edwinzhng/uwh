import { expect, test } from "bun:test";
import { initialAppData, previewAccounts } from "../demo/app-data";
import { reduceApp } from "./app-reducer";
import { visibleAppData } from "./app-visibility";
import { withGeneralChat } from "./general-chat";

test("General preserves the club thread id and message history while including every account", () => {
	const accounts = previewAccounts.map((account) => account.id);
	const result = withGeneralChat(initialAppData, accounts);
	expect(result.messages).toBe(initialAppData.messages);
	expect(
		result.conversations.filter((thread) => thread.id === "club"),
	).toHaveLength(1);
	expect(
		result.conversations.find((thread) => thread.id === "club")?.title,
	).toBe("General");
	for (const account of previewAccounts)
		expect(
			visibleAppData(result, account).conversations.some(
				(thread) => thread.id === "club",
			),
		).toBe(true);
	expect(withGeneralChat(result, accounts)).toEqual(result);
});
test("General is created for empty clubs and drops former members", () => {
	const data = { ...initialAppData, conversations: [] };
	expect(
		withGeneralChat(data, ["new"]).conversations.at(0)?.accountIds,
	).toEqual(["new"]);
	const joined = withGeneralChat(initialAppData, ["new", "former"]);
	expect(
		withGeneralChat(joined, ["new"]).conversations.find(
			(thread) => thread.id === "club",
		)?.accountIds,
	).toEqual(["new"]);
});
test("non-player household accounts can use General", () => {
	const account = previewAccounts.find((entry) => entry.id === "jamie");
	if (!account) throw new Error("Fixture missing");
	const data = withGeneralChat(
		initialAppData,
		previewAccounts.map((entry) => entry.id),
	);
	expect(() =>
		reduceApp(data, account, {
			type: "send-message",
			id: "general-unit",
			threadId: "club",
			body: "Unit fixture only",
			time: "Now",
		}),
	).not.toThrow();
});
