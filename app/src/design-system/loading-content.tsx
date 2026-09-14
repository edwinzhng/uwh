import { type ReactElement, useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";
export const LoadingContent = (): ReactElement => {
	const theme = useTheme();
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setVisible(true), 300);
		return (): void => clearTimeout(timer);
	}, []);
	return (
		<View
			accessibilityLabel={visible ? "Loading content" : undefined}
			accessibilityRole={visible ? "progressbar" : undefined}
			style={{
				gap: space.sm,
				paddingVertical: space.sm,
				opacity: visible ? 1 : 0,
			}}
		>
			{[0, 1, 2].map((id) => (
				<View
					key={id}
					style={{
						height: geometry.touch,
						borderRadius: corners.control,
						backgroundColor: theme.background.secondary,
					}}
				/>
			))}
		</View>
	);
};
