import { createContext, useContext } from "react";
import type { PollDraft, ThreadTools } from "../domain/chat-polls";

export type ThreadToolsState = ThreadTools & {
	loading: boolean;
	readOnly: boolean;
	create: (key: string, draft: PollDraft) => Promise<void>;
	vote: (pollId: string, choices: number[]) => Promise<void>;
	close: (pollId: string) => Promise<void>;
	pin: (messageId: string, pinned: boolean) => Promise<void>;
};
export const ThreadToolsContext = createContext<ThreadToolsState | undefined>(
	undefined,
);
export const useThreadTools = (): ThreadToolsState | undefined =>
	useContext(ThreadToolsContext);
