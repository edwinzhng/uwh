export type PersonChoice = {
	id: string;
	name: string;
	relationship: "You" | "Child";
};
export type PersonPickerProps = {
	value: string;
	options: readonly PersonChoice[];
	onValueChange: (id: string) => void;
	account?: {
		name: string;
		onSettings: () => void;
	};
};
