import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, ReactionPicker, Row } from "../design-system";
import type { Message } from "../domain/app-types";
import { reactionChoices } from "../domain/messaging";

export const MessageReactions = ({
	message,
	picker = false,
}: {
	message: Message;
	picker?: boolean;
}): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const [pending, setPending] = useState(false);
	const react = async (emoji: string): Promise<void> => {
		if (pending) return;
		setPending(true);
		await dispatch({
			type: "set-reaction",
			messageId: message.id,
			emoji,
			active: !message.reactions
				?.find((reaction) => reaction.emoji === emoji)
				?.accountIds.includes(account.id),
		});
		setPending(false);
	};
	if (picker)
		return (
			<ReactionPicker
				isDisabled={pending}
				onSelect={(emoji): void => {
					void react(emoji);
				}}
			/>
		);
	if (!message.reactions?.length) return undefined;
	return (
		<Row gap="xxs" wrap>
			{message.reactions?.map((reaction) => {
				const selected = reaction.accountIds.includes(account.id);
				return (
					<Button
						key={reaction.emoji}
						label={`${reaction.emoji} ${reaction.accountIds.length}`}
						accessibilityLabel={`${reactionChoices.find((choice) => choice.emoji === reaction.emoji)?.label ?? reaction.emoji}, ${reaction.accountIds.length}. ${selected ? "Remove your reaction" : "React"}`}
						isSelected={selected}
						variant={selected ? "secondary" : "ghost"}
						isDisabled={pending}
						onPress={(): void => {
							void react(reaction.emoji);
						}}
					/>
				);
			})}
		</Row>
	);
};
