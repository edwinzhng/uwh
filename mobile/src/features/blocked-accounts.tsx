import type { ReactElement } from "react";
import { useChatSafety } from "../backend/chat-safety";
import {
	Button,
	ListItem,
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
				<Stack>
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
					) : (
						<Text variant="small" tone="secondary">
							No blocked accounts
						</Text>
					)}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Surface>
		</Stack>
	);
};
