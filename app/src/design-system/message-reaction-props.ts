export type MessageReactionProps = {
	outgoing: boolean;
	isOpen: boolean;
	isDisabled?: boolean;
	mode: "quick" | "all";
	error?: string;
	recent: string[];
	selected: string[];
	onPress: () => void;
	onClose: () => void;
	onAll: () => void;
	onSelect: (emoji: string) => void;
	onShowActions: () => void;
};
