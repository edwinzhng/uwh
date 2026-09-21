import type { ReactElement } from "react";
import { ImageBackground, View } from "react-native";
import authBackground from "../../assets/auth-uwh-motion.jpg";

export const AuthBackground = (): ReactElement => (
	<ImageBackground
		source={authBackground}
		style={{
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
		}}
		resizeMode="cover"
	>
		<View
			style={{
				flex: 1,
				backgroundColor: "rgba(0, 38, 55, 0.28)",
			}}
		/>
	</ImageBackground>
);
