const input = { keyboard: false };
export const pageMotionAllowed = (): boolean => !input.keyboard;
export const trackPageMotionInput = (): (() => void) => {
	const keyboard = (): void => {
		input.keyboard = true;
	};
	const pointer = (): void => {
		input.keyboard = false;
	};
	document.addEventListener("keydown", keyboard, true);
	document.addEventListener("pointerdown", pointer, true);
	return (): void => {
		document.removeEventListener("keydown", keyboard, true);
		document.removeEventListener("pointerdown", pointer, true);
	};
};
