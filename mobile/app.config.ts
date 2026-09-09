import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
	name: "Crocs Club",
	slug: "crocs-club",
	scheme: "crocs-club",
	version: "0.1.0",
	extra: { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } },
	userInterfaceStyle: "automatic",
	ios: { supportsTablet: true, bundleIdentifier: "club.crocs.preview" },
	android: {
		package: "club.crocs.preview",
		softwareKeyboardLayoutMode: "resize",
	},
	web: { bundler: "metro", output: "static" },
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
