import { expect, test } from "bun:test";
import { createStore } from "jotai";
import {
	previewActionAtom,
	previewDataAtom,
	selectedPersonAtom,
	selectPreviewAccountAtom,
} from "../src/demo/app-state";
import { eventResponse } from "../src/domain/app-rules";

test("family switching preserves independent responses and progress without changing the account", (): void => {
	const store = createStore();
	store.set(selectedPersonAtom, "sam");
	store.set(previewActionAtom, {
		type: "respond",
		eventId: "youth-thu",
		personId: "sam",
		response: "unavailable",
	});
	store.set(selectedPersonAtom, "mila");
	expect(
		eventResponse(store.get(previewDataAtom), "youth-thu", "sam").response,
	).toBe("unavailable");
	expect(
		eventResponse(store.get(previewDataAtom), "youth-thu", "mila").response,
	).toBe("going");
	const capturedAction = {
		type: "respond",
		eventId: "youth-thu",
		personId: "mila",
		response: "unavailable",
	} as const;
	store.set(selectedPersonAtom, "sam");
	store.set(previewActionAtom, capturedAction);
	expect(
		eventResponse(store.get(previewDataAtom), "youth-thu", "mila").response,
	).toBe("unavailable");
	expect(store.get(selectedPersonAtom)).toBe("sam");
});

test("family selection survives navigation-style subscriptions and resets for another account", (): void => {
	const store = createStore();
	store.set(selectedPersonAtom, "mila");
	const unsubscribe = store.sub(selectedPersonAtom, (): void => undefined);
	unsubscribe();
	expect(store.get(selectedPersonAtom)).toBe("mila");
	store.set(selectPreviewAccountAtom, "taylor");
	expect(store.get(selectedPersonAtom)).toBe("taylor");
});
