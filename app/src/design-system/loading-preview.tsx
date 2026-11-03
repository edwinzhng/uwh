import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { Button } from "./button";
import { LoadingHandoff } from "./loading-handoff";
import { space } from "./tokens";
export const LoadingPreview = ({
	enabled,
	children,
}: {
	enabled: boolean;
	children: ReactNode;
}): ReactNode => {
	const [loading, setLoading] = useState(true);
	return enabled ? (
		<View style={{ flex: 1 }}>
			<LoadingHandoff loading={loading} keepMounted>
				{children}
			</LoadingHandoff>
			<View
				style={{
					position: "absolute",
					bottom: space.xxl,
					alignSelf: "center",
					zIndex: 2,
				}}
			>
				<Button
					onPress={(): void => setLoading(!loading)}
					label={loading ? "Reveal app" : "Replay loading"}
				/>
			</View>
		</View>
	) : (
		children
	);
};
