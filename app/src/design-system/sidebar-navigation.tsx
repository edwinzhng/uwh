import { type ReactElement, useState } from "react";
import { View } from "react-native";
import { HoverSurface } from "./hover-surface";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { space } from "./tokens";

export const SidebarNavigation = ({
	navigation,
}: {
	navigation: NavigationItem[];
}): ReactElement => {
	const [pending, setPending] = useState<{
		from: string | undefined;
		label: string;
	}>();
	const activeLabel = navigation.find((item) => item.selected)?.label;
	const selected =
		pending && pending.from === activeLabel ? pending.label : activeLabel;
	const select = (item: NavigationItem): void => {
		setPending({ from: activeLabel, label: item.label });
		item.onPress();
	};
	return (
		<HoverSurface selector='[role="tab"]'>
			<View
				accessibilityRole="tablist"
				accessibilityLabel="Main navigation"
				style={{ gap: space.xxs }}
			>
				{navigation.map((item) => (
					<NavigationControl
						sharedHover
						key={item.label}
						item={{
							...item,
							selected: item.label === selected,
							onPress: (): void => select(item),
						}}
					/>
				))}
			</View>
		</HoverSurface>
	);
};
