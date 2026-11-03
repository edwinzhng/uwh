import type { ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import { sectionNavigationPresentation } from "./section-navigation-model";
import { Tabs } from "./tabs";

type Navigation<T extends string> = {
	value: T;
	options: readonly {
		value: T;
		label: string;
		isDisabled?: boolean;
	}[];
	onValueChange: (value: T) => void;
};

type Props<T extends string, CompactValue extends string> = Navigation<T> & {
	label: string;
	page?: boolean;
	hideLabel?: boolean;
	compactNavigation?: Navigation<CompactValue>;
	compactPresentation?: "tabs" | "hidden";
};

export const SectionNavigation = <
	T extends string,
	CompactValue extends string = T,
>({
	label,
	page,
	hideLabel,
	value,
	options,
	onValueChange,
	compactNavigation,
	compactPresentation = "tabs",
}: Props<T, CompactValue>): ReactElement | undefined => {
	const { width } = useWindowDimensions();
	if (sectionNavigationPresentation(width) === "tabs")
		return (
			<Tabs
				label={label}
				page={page}
				hideLabel={hideLabel}
				value={value}
				options={options}
				onValueChange={onValueChange}
			/>
		);
	if (compactPresentation === "hidden") return undefined;
	if (compactNavigation)
		return (
			<Tabs
				label={label}
				value={compactNavigation.value}
				options={compactNavigation.options}
				onValueChange={compactNavigation.onValueChange}
			/>
		);
	return (
		<Tabs
			label={label}
			value={value}
			options={options}
			onValueChange={onValueChange}
		/>
	);
};
