import { atom, useStore } from "jotai";
import { useState } from "react";
import { useApp } from "../demo/app-state";
import type { Message } from "../domain/app-types";
import { useTask } from "./use-task";

export type MessageReactionControls = {
	isOpen: boolean;
	mode: "quick" | "all";
	openAll: () => void;
	open: () => void;
	close: () => void;
	recent: string[];
	selected: string[];
	pending: boolean;
	error?: string;
	clear: () => void;
	react: (emoji: string) => Promise<boolean>;
};
const recentReactionsAtom = atom<Record<string, string[]>>({});

export const useMessageReaction = (
	message: Message,
): MessageReactionControls => {
	const { account, dispatch, source } = useApp();
	const task = useTask();
	const [isOpen, setOpen] = useState(false);
	const [mode, setMode] = useState<"quick" | "all">("quick");
	const store = useStore();
	const [recent, setRecent] = useState<string[]>([]);
	const scope = `${source}:${account.id}`;
	return {
		isOpen,
		mode,
		openAll: (): void => {
			task.clear();
			setRecent(store.get(recentReactionsAtom)[scope] ?? []);
			setMode("all");
			setOpen(true);
		},
		open: (): void => {
			setMode("quick");
			task.clear();
			setRecent(store.get(recentReactionsAtom)[scope] ?? []);
			setOpen(true);
		},
		close: (): void => {
			if (!task.busy) setOpen(false);
		},
		recent,
		selected:
			message.reactions
				?.filter((entry) => entry.accountIds.includes(account.id))
				.map((entry) => entry.emoji) ?? [],
		pending: task.busy,
		error: task.error,
		clear: task.clear,
		react: (emoji): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				const saved = await dispatch({
					type: "set-reaction",
					messageId: message.id,
					emoji,
					active: !message.reactions
						?.find((reaction) => reaction.emoji === emoji)
						?.accountIds.includes(account.id),
				});
				if (!saved)
					throw new Error("Couldn’t save your reaction. Please try again.");
				const choices = [
					emoji,
					...(store.get(recentReactionsAtom)[scope] ?? []).filter(
						(entry) => entry !== emoji,
					),
				].slice(0, 18);
				store.set(recentReactionsAtom, (previous) => ({
					...previous,
					[scope]: choices,
				}));
				setRecent(choices);
			}),
	};
};
