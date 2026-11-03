import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { ReactionPill, Row, Stack, Text } from "../design-system";
import type { Message } from "../domain/app-types";
import { reactionChoices } from "../domain/messaging";
import type { MessageReactionControls } from "./use-message-reaction";

export const MessageReactions = ({
	message,
	controls,
}: {
	message: Message;
	controls: MessageReactionControls;
}): ReactElement | undefined => {
	const { account } = useApp();
	if (!message.reactions?.length) return undefined;
	return (
		<Stack gap="xxs">
			<Row gap="xxs" wrap>
				{message.reactions?.map((reaction) => {
					const selected = reaction.accountIds.includes(account.id);
					return (
						<ReactionPill
							key={reaction.emoji}
							label={`${reaction.emoji} ${reaction.accountIds.length}`}
							accessibilityLabel={`${reactionChoices.find((choice) => choice.emoji === reaction.emoji)?.label ?? reaction.emoji}, ${reaction.accountIds.length}. ${selected ? "Remove your reaction" : "React"}`}
							isSelected={selected}
							isDisabled={controls.pending}
							onPress={(): void => {
								void controls.react(reaction.emoji);
							}}
						/>
					);
				})}
			</Row>
			{controls.error ? (
				<Text variant="caption" tone="danger">
					{controls.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
