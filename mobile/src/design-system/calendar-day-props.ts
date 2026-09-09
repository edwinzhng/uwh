export type CalendarDayProps = {
	value: string;
	label: string;
	selected: boolean;
	today: boolean;
	muted: boolean;
	count: number;
	focusOnSelection: boolean;
	onPress: () => void;
	onNavigate: (key: string) => boolean;
};
