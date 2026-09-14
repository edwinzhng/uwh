import Picker from "@emoji-mart/react";
import type { ReactElement } from "react";
import { emojiData } from "./emoji-data";
import type { EmojiPickerProps } from "./emoji-picker-props";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const EmojiPicker = ({ onSelect }: EmojiPickerProps): ReactElement => {
	const theme = useTheme();
	return (
		<Picker
			data={emojiData}
			onEmojiSelect={(emoji: { native: string }): void =>
				onSelect(emoji.native)
			}
			theme={theme.background.primary === "#FFFFFF" ? "light" : "dark"}
			set="native"
			emojiVersion={15}
			perLine={7}
			emojiButtonSize={geometry.touch}
			emojiButtonRadius={`${corners.control}px`}
			previewPosition="none"
			skinTonePosition="search"
			maxFrequentRows={0}
			autoFocus
		/>
	);
};
