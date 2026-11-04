import type { RichFormatRequest } from "./rich-message-model";

export type RichMessageEditorProps = {
	embedded?: boolean;
	onFocus?: () => void;
	rows?: number;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	isDisabled?: boolean;
	maxLength?: number;
	formatRequest?: RichFormatRequest;
	insertRequest?: { id: string; text: string };
	focusKey?: string;
	resetKey?: string;
	onSubmit?: () => void;
	onError?: (error: string | undefined) => void;
	onCompositionChange?: (composing: boolean) => void;
};
