import { expect, test } from "bun:test";
import type { Conversation } from "../src/domain/app-types";
import { chatFirstName, chatHeaderTitle } from "../src/domain/chat-labels";

const group: Conversation = {
	id: "group-test",
	kind: "group",
	title: "Jordan Fryers, Adam Guindon +2",
	subtitle: "Group chat",
	accountIds: [],
};

test("chat names shorten people without rewriting named groups or programs", (): void => {
	expect(chatHeaderTitle(group, ["Jordan Fryers", "Adam Guindon"])).toBe(
		"Jordan, Adam +2",
	);
	expect(chatHeaderTitle({ ...group, title: "2024/2025 Crocs Exec" }, [])).toBe(
		"2024/2025 Crocs Exec",
	);
	expect(
		chatHeaderTitle({ ...group, title: "Training, game planning" }, [
			"Jordan Fryers",
		]),
	).toBe("Training, game planning");
	expect(
		chatHeaderTitle({ ...group, kind: "direct", title: "Adam Guindon" }, []),
	).toBe("Adam");
	expect(
		chatHeaderTitle(
			{ ...group, id: "room:program:monday", title: "Monday Program" },
			[],
		),
	).toBe("Monday Program");
	expect(chatFirstName("  Élise   Åström ")).toBe("Élise");
});
