import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { friendlyError } from "../backend/errors";
import { useMessaging } from "../backend/messaging-context";
import type { ThreadMessage } from "../domain/messaging";

export const useMessageReadState = (
	threadId: string,
	latest: ThreadMessage | undefined,
	visible: boolean,
): { error?: string; retry: () => void } => {
	const { threads, markRead } = useMessaging();
	const through =
		threads.find((thread) => thread.id === threadId)?.readThrough ?? 0;
	const [active, setActive] = useState(AppState.currentState === "active");
	const [focused, setFocused] = useState(false);
	const [error, setError] = useState<string>();
	useEffect(() => {
		const subscription = AppState.addEventListener("change", (state): void =>
			setActive(state === "active"),
		);
		return (): void => subscription.remove();
	}, []);
	useFocusEffect(
		useCallback(() => {
			setFocused(true);
			return (): void => setFocused(false);
		}, []),
	);
	const messageId = latest?.id;
	const createdAt = latest?.createdAt ?? 0;
	const read = useCallback((): void => {
		if (!focused || !active || !visible || !messageId || createdAt <= through)
			return;
		setError(undefined);
		void markRead(threadId, messageId).catch((error): void => {
			setError(friendlyError(error));
		});
	}, [
		threadId,
		messageId,
		createdAt,
		through,
		visible,
		focused,
		active,
		markRead,
	]);
	useEffect(read, [read]);
	return { error, retry: read };
};
