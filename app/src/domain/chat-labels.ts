import type { Conversation } from "./app-types";
import { conversationKind } from "./messaging";

export const chatFirstName = (name: string): string =>
	name.trim().split(/\s+/).at(0) ?? "";

export const chatHeaderTitle = (
	thread: Conversation,
	names: readonly string[],
): string => {
	const kind = conversationKind(thread);
	if (kind === "direct") return chatFirstName(thread.title);
	if (kind !== "group" || !thread.title.includes(",")) return thread.title;
	const suffix = thread.title.match(/\s+\+\d+$/)?.at(0) ?? "";
	const labels = thread.title
		.slice(0, thread.title.length - suffix.length)
		.split(",")
		.map((name) => name.trim());
	const people = new Set(
		names.flatMap((name) => [name.trim(), chatFirstName(name)]),
	);
	return labels.every((label) => people.has(label))
		? labels.map(chatFirstName).join(", ") + suffix
		: thread.title;
};
