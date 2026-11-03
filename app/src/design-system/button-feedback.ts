export type ButtonActivation = {
	isDisabled?: boolean;
	isLoading?: boolean;
	validationError?: string;
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
