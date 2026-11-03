import type { ButtonVariant } from "./button-colors";

export type ButtonActivation = {
	isDisabled?: boolean;
	isLoading?: boolean;
	validationError?: string;
};
export const raisedButton = (variant: ButtonVariant): boolean =>
	variant === "solid" || variant === "secondary" || variant === "danger";
export const buttonPressGeometry = (
	progress: number,
	depth: number,
	canAnimate: boolean,
): { travel: number; exposedBase: number } => {
	"worklet";
	const distance = Math.max(0, depth);
	const fraction = canAnimate ? Math.max(0, Math.min(1, progress)) : 0;
	const travel = distance * fraction;
	return { travel, exposedBase: distance - travel };
};
export const activateButton = (
	input: ButtonActivation,
	action: () => void,
	haptic: () => void,
	onInvalid?: (message: string) => void,
): boolean => {
	if (input.isDisabled || input.isLoading) return false;
	if (input.validationError) {
		onInvalid?.(input.validationError);
		return false;
	}
	action();
	haptic();
	return true;
};
