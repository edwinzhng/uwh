import { useVisibleViewport } from "./use-visible-viewport";

export const useKeyboardVisible = (): boolean =>
	useVisibleViewport().keyboardVisible;
