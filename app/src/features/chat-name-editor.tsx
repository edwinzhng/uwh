import { useMutation } from "convex/react";
import { useSetAtom } from "jotai";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { previewDataAtom, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { Conversation } from "../domain/app-types";
import { canRenameChat } from "../domain/chat-appearance";
import { useFormTask } from "./use-form-task";

type Props = { thread: Conversation; onClose: () => void };
const NameForm = ({
	thread,
	onClose,
	save,
}: Props & {
	save: (title: string, expectedTitle: string) => Promise<void>;
}): ReactElement => {
	const [title, setTitle] = useState(thread.title);
	const [expectedTitle] = useState(thread.title);
	const task = useFormTask();
	return (
		<Dialog
			title="Chat name"
			intent="form"
			isOpen
			isDismissDisabled={task.busy}
			onOpenChange={(open): void => {
				if (!open) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() =>
								!title.trim() || title.trim().length > 80
									? "Use 1–80 characters."
									: undefined,
							async (): Promise<void> => {
								await save(title.trim(), expectedTitle);
								onClose();
							},
						);
					}}
				/>
			}
		>
			<Stack>
				<Field
					label="Name"
					value={title}
					onValueChange={setTitle}
					isDisabled={task.busy}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
const LiveName = (props: Props): ReactElement => {
	const rename = useMutation(api.chat_appearance.rename);
	return (
		<NameForm
			thread={props.thread}
			onClose={props.onClose}
			save={async (title, expectedTitle): Promise<void> => {
				await rename({
					threadId: props.thread.id,
					title,
					expectedTitle,
				});
			}}
		/>
	);
};
const PreviewName = (props: Props): ReactElement => {
	const setData = useSetAtom(previewDataAtom);
	const { account } = useApp();
	return (
		<NameForm
			thread={props.thread}
			onClose={props.onClose}
			save={async (title, expectedTitle): Promise<void> => {
				setData((data) => ({
					...data,
					conversations: data.conversations.map((thread) => {
						if (thread.id !== props.thread.id) return thread;
						if (!canRenameChat(thread, account))
							throw new Error("This chat’s name can’t be changed.");
						if (thread.title !== expectedTitle && thread.title !== title)
							throw new Error("The chat name changed. Reopen this editor.");
						return { ...thread, title };
					}),
				}));
			}}
		/>
	);
};
export const ChatNameEditor = (props: Props): ReactElement | undefined => {
	const { account, source } = useApp();
	if (!canRenameChat(props.thread, account)) return undefined;
	return source === "convex" ? (
		<LiveName thread={props.thread} onClose={props.onClose} />
	) : (
		<PreviewName thread={props.thread} onClose={props.onClose} />
	);
};
