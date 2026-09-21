import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
	name: "Calgary UWH",
	slug: "calgary-uwh",
	owner: "calgary-uwh",
	scheme: "uwh-club",
	version: "0.1.0",
	icon: "./assets/app-icon.png",
	extra: {
		eas: {
			projectId:
				process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
				"8670108c-8259-43e5-8799-f1d4078577e8",
		},
	},
	userInterfaceStyle: "automatic",
	ios: {
		supportsTablet: true,
		bundleIdentifier: "com.base69c3f808e02b5b2113ac2191.app",
		infoPlist: { ITSAppUsesNonExemptEncryption: false },
	},
	android: {
		package: "club.crocs.preview",
		softwareKeyboardLayoutMode: "resize",
	},
	web: {
		bundler: "metro",
		output: "static",
		favicon: "./assets/club-logo.png",
	},
	plugins: [
		"expo-notifications",
		[
			"expo-speech-recognition",
			{
				microphonePermission: "Use your microphone to dictate chat messages.",
				speechRecognitionPermission:
					"Turn your speech into an editable message draft.",
			},
		],
		"expo-sharing",
		[
			"expo-image-picker",
			{
				photosPermission: "Choose photos to share with your club.",
				cameraPermission: false,
				microphonePermission: "Use your microphone to dictate chat messages.",
			},
		],
		"expo-router",
		"expo-font",
		"expo-status-bar",
		"expo-splash-screen",
	],
};

export default config;
