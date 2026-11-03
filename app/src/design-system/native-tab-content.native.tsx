import { useIsFocused } from "expo-router";
import { type ReactElement, useEffect, useState } from "react";
import { View } from "react-native";

export const NativeTabContent = ({
	children,
}: {
	children: ReactElement;
}): ReactElement => {
	const focused = useIsFocused();
	const [activated, setActivated] = useState(focused);
	useEffect((): void => {
		if (focused) setActivated(true);
	}, [focused]);
	return activated || focused ? children : <View style={{ flex: 1 }} />;
};
