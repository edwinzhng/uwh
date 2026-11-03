export type ContextMenuTriggerProps = {
	label: string;
	isOpen: boolean;
	isFocused: boolean;
	isDisabled?: boolean;
	onOpen: () => void;
	onFocusChange: (focused: boolean) => void;
};
