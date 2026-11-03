import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { createDraftAtom } from "../src/features/use-draft";

test("typing updates only its draft subscribers and preserves other form drafts", (): void => {
	const store = createStore();
	const chat = createDraftAtom("chat:one");
	const note = createDraftAtom("coach:note");
	const updates = { chat: 0, note: 0 };
	const stopChat = store.sub(chat, (): void => {
		updates.chat += 1;
	});
	const stopNote = store.sub(note, (): void => {
		updates.note += 1;
	});
	store.set(note, "Existing note");
	for (const value of ["H", "He", "Hello", "Hello"]) store.set(chat, value);
	expect(updates).toEqual({ chat: 3, note: 1 });
	expect(store.get(note)).toBe("Existing note");
	expect(store.get(createDraftAtom("chat:one"))).toBe("Hello");
	stopChat();
	stopNote();
});
