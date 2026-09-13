import type { ReactElement } from "react";
import { useChatSafety } from "../backend/chat-safety";
import {
	Button,
	EmptyState,
	List,
	ListItem,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { useTask } from "./use-task";

export const BlockedAccounts = (): ReactElement => {
	const safety = useChatSafety();
	const task = useTask();
	return (
		<Stack gap="sm">
			<SectionHeading>Blocked accounts</SectionHeading>
			<Surface>
				<List>
					{safety.status?.blocked.length ? (
						safety.status.blocked.map((account) => (
							<ListItem
								key={account.id}
								title={account.name}
								trailing={
									<Button
										label="Unblock"
										variant="secondary"
										isDisabled={task.busy}
										onPress={(): void => {
											void task.run(async (): Promise<void> => {
												await safety.block?.(account.id, false);
											});
										}}
									/>
								}
							/>
						))
					) : safety.available && safety.status === undefined ? (
						<LoadingContent />
					) : (
						<EmptyState
							title="No blocked accounts"
							description="Accounts you block from a conversation will appear here."
						/>
					)}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</List>
			</Surface>
		</Stack>
	);
};
