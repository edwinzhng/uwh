declare module "*.png" {
	const source: import("react-native").ImageSourcePropType;
	export default source;
}

declare module "*.jpg" {
	const source: import("react-native").ImageSourcePropType;
	export default source;
}

declare module "*.ttf" {
	const source: import("expo-font").FontSource;
	export default source;
}

declare module "*.otf" {
	const source: import("expo-font").FontSource;
	export default source;
}
