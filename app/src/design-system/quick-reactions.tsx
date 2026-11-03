import type { ReactElement } from "react";
import { reactionChoices } from "../domain/messaging";
import { EmojiChoice } from "./emoji-choice";
import { IconButton } from "./icon-button";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

export const QuickReactions = ({
	onSelect,
	onAll,
	selected,
	isDisabled,
	error,
}: {
	onSelect: (emoji: string) => void;
	onAll: () => void;
	selected: string[];
	isDisabled?: boolean;
	error?: string;
}): ReactElement => (
	<Stack gap="xs">
		<Row gap="none">
			{reactionChoices.slice(0, 5).map((choice) => (
				<EmojiChoice
					key={choice.emoji}
					emoji={choice.emoji}
					label={choice.label}
					isSelected={selected.includes(choice.emoji)}
					isDisabled={isDisabled}
					onSelect={onSelect}
				/>
			))}
			<IconButton
				icon="plus"
				label="All reactions"
				isDisabled={isDisabled}
				onPress={onAll}
			/>
		</Row>
		{error ? (
			<Text variant="caption" tone="danger">
				{error}
			</Text>
		) : undefined}
	</Stack>
);
