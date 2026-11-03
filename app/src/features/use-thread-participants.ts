import { useMutation, useQuery } from "convex/react";
import { useSetAtom } from "jotai";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { addPreviewParticipantsAtom } from "../demo/thread-participants-state";
import type { Conversation } from "../domain/app-types";
import {
	previewThreadParticipants,
	type ThreadParticipantState,
} from "../domain/thread-participants";

export type ParticipantControls = {
	state?: ThreadParticipantState;
	add: (recipientIds: string[], groupId: string) => Promise<string>;
};
export const useLiveThreadParticipants = (
	thread: Conversation,
): ParticipantControls => {
	const state = useQuery(api.thread_participants.current, {
		threadId: thread.id,
	});
	const add = useMutation(api.thread_participants.add);
	return {
		state: state ?? undefined,
		add: (recipientIds, groupId): Promise<string> =>
			add({ threadId: thread.id, recipientIds, groupId }),
	};
};
export const usePreviewThreadParticipants = (
	thread: Conversation,
): ParticipantControls => {
	const { data, accounts, account } = useApp();
	const add = useSetAtom(addPreviewParticipantsAtom);
	return {
		state: previewThreadParticipants(data, accounts, account, thread),
		add: async (recipientIds, groupId): Promise<string> =>
			add({ threadId: thread.id, recipientIds, groupId }),
	};
};
