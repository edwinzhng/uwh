import type { ReactElement } from "react";
import { View } from "react-native";
import { reactionChoices } from "../domain/messaging";
import { EmojiChoice } from "./emoji-choice";
import { Row } from "./row";
import { Text } from "./text";
import { space } from "./tokens";

export const ReactionShortcuts = ({
	onSelect,
	isDisabled,
	recent,
	selected,
}: {
	onSelect: (emoji: string) => void;
	isDisabled?: boolean;
	recent: string[];
	selected: string[];
}): ReactElement => (
	<View style={{ gap: space.xs }}>
		<Text variant="small" tone="secondary">
			Your reactions
		</Text>
		<Row gap="none" wrap>
			{reactionChoices.map((choice) => (
				<EmojiChoice
					key={choice.emoji}
					emoji={choice.emoji}
					label={choice.label}
					onSelect={onSelect}
					isDisabled={isDisabled}
					isSelected={selected.includes(choice.emoji)}
				/>
			))}
		</Row>
		{recent.length ? (
			<>
				<Text variant="small" tone="secondary">
					Recent
				</Text>
				<Row gap="none" wrap>
					{recent.map((emoji) => (
						<EmojiChoice
							key={emoji}
							emoji={emoji}
							label={emoji}
							onSelect={onSelect}
							isDisabled={isDisabled}
							isSelected={selected.includes(emoji)}
						/>
					))}
				</Row>
			</>
		) : undefined}
	</View>
);
