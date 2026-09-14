type SubmitKey = {
	key: string;
	shiftKey?: boolean;
	isComposing?: boolean;
	keyCode?: number;
};

export const isSubmitKey = (event: SubmitKey): boolean =>
	event.key === "Enter" &&
	!event.shiftKey &&
	!event.isComposing &&
	event.keyCode !== 229;
