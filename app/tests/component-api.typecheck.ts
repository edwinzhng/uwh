import type { ButtonProps } from "../src/design-system/button-props";
import type { DialogProps } from "../src/design-system/dialog-content";
import type { ChoiceOption } from "../src/design-system/picker-props";

type Assert<T extends true> = T;
type ButtonBase = { label: string; onPress: () => void };
type DialogBase = {
	title: string;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	children: string;
};
export type ComponentApiContracts = [
	Assert<
		ButtonBase & { icon: "plus"; prefix: "check" } extends ButtonProps
			? false
			: true
	>,
	Assert<
		ButtonBase & { leading: string; prefix: "check" } extends ButtonProps
			? false
			: true
	>,
	Assert<
		DialogBase & {
			hideHeader: true;
			back: { label: string; onPress: () => void };
		} extends DialogProps
			? false
			: true
	>,
	Assert<
		{
			value: "member";
			label: string;
			person: { name: string };
			icon: "users";
		} extends ChoiceOption<"member">
			? false
			: true
	>,
	Assert<ButtonBase & { prefix: "plus" } extends ButtonProps ? true : false>,
	Assert<
		DialogBase & {
			back: { label: string; onPress: () => void };
		} extends DialogProps
			? true
			: false
	>,
];
