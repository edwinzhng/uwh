import type { ReactElement } from "react";
import { ImageBackground } from "react-native";
export const AuthBackground = (): ReactElement => (
	<ImageBackground
		source={{
			uri: "https://images.unsplash.com/photo-1614667288602-9ac6e37318a7?auto=format&fit=crop&w=1600&q=85",
		}}
		blurRadius={5}
		style={{
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			opacity: 0.65,
		}}
	/>
);
