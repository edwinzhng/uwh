import type { ReactElement } from "react";

export type EmojiPickerProps = {
	onSelect: (emoji: string) => void;
	search: string;
	isDisabled?: boolean;
	selected?: string[];
	header?: ReactElement;
};
