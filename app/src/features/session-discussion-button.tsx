import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useChatSafety } from "../backend/chat-safety";
import { useMessaging } from "../backend/messaging-context";
import { useApp } from "../demo/app-state";
import { Button, Stack, Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { canDiscussSession } from "../domain/session-discussion";
import { useTask } from "./use-task";

export const SessionDiscussionButton = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { account, data } = useApp();
	const messaging = useMessaging();
	const safety = useChatSafety();
	const router = useRouter();
	const task = useTask();
	if (!canDiscussSession(account, event, data.members)) return undefined;
	return (
		<Stack>
			<Button
				label="Session discussion"
				variant="secondary"
				isLoading={task.busy}
				isDisabled={Boolean(safety.status?.paused)}
				onPress={(): void => {
					void task.run(async (): Promise<void> => {
						const id = await messaging.openSession(event.id);
						router.push({ pathname: "/conversation", params: { id } });
					});
				}}
			/>
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
		</Stack>
	);
};
