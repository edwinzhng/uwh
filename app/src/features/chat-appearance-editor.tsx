import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useChatSafety } from "../backend/chat-safety";
import { previewDataAtom, useApp } from "../demo/app-state";
import type { Conversation } from "../domain/app-types";
import {
	type ChatAppearance,
	canEditChatAppearance,
	sameChatAppearance,
} from "../domain/chat-appearance";
import { ChatAppearanceForm } from "./chat-appearance-form";

type Props = { thread: Conversation; onClose: () => void };
type Save = (next: ChatAppearance, expected: ChatAppearance) => Promise<void>;

const AppearanceEditor = ({
	thread,
	save,
	onClose,
}: Props & { save: Save }): ReactElement | undefined => {
	const { account } = useApp();
	const safety = useChatSafety();
	if (!canEditChatAppearance(thread, account) || safety.status?.paused)
		return undefined;
	return <ChatAppearanceForm thread={thread} save={save} onClose={onClose} />;
};

const LiveEditor = ({ thread, onClose }: Props): ReactElement => {
	const save = useMutation(api.chat_appearance.save);
	return (
		<AppearanceEditor
			thread={thread}
			onClose={onClose}
			save={async (next, expected): Promise<void> => {
				await save({
					threadId: thread.id,
					icon: next.avatarIcon,
					imageId: next.avatarImageId,
					expectedIcon: expected.avatarIcon,
					expectedImageId: expected.avatarImageId,
				});
			}}
		/>
	);
};

const PreviewEditor = ({ thread, onClose }: Props): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	const { account } = useApp();
	return (
		<AppearanceEditor
			thread={thread}
			onClose={onClose}
			save={async (next, expected): Promise<void> => {
				setData((data) => {
					const current = data.conversations.find(
						(entry) => entry.id === thread.id,
					);
					if (!current || !canEditChatAppearance(current, account))
						throw new Error("Chat unavailable.");
					if (
						!sameChatAppearance(current, expected) &&
						!sameChatAppearance(current, next)
					)
						throw new Error(
							"The chat picture changed. Close and reopen this editor.",
						);
					return {
						...data,
						conversations: data.conversations.map((entry) =>
							entry.id === thread.id
								? {
										...entry,
										avatarIcon: next.avatarIcon,
										avatarImageId: next.avatarImageId,
									}
								: entry,
						),
					};
				});
			}}
		/>
	);
};

export const ChatAppearanceEditor = ({
	thread,
	onClose,
}: Props): ReactElement =>
	useApp().source === "convex" ? (
		<LiveEditor thread={thread} onClose={onClose} />
	) : (
		<PreviewEditor thread={thread} onClose={onClose} />
	);
