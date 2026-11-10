import type { ExpoConfig } from "expo/config";

const projectId =
	process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
	"8670108c-8259-43e5-8799-f1d4078577e8";

const microphonePermission =
	"Use your microphone to dictate chat messages and record voice notes on club video clips.";

const config: ExpoConfig = {
	name: "UWH Club",
	slug: "calgary-uwh",
	owner: "calgary-uwh",
	scheme: "uwh-club",
	version: "1.0.0",
	icon: "./assets/app-icon.png",
	extra: {
		eas: {
			projectId,
		},
	},
	runtimeVersion: { policy: "fingerprint" },
	updates: {
		enabled: true,
		url: `https://u.expo.dev/${projectId}`,
		checkAutomatically: "ON_LOAD",
		fallbackToCacheTimeout: 0,
	},
	userInterfaceStyle: "light",
	experiments: {
		baseUrl: process.env.EXPO_REVIEW_BASE_PATH ?? "",
	},
	ios: {
		supportsTablet: true,
		usesAppleSignIn: true,
		entitlements: { "com.apple.developer.applesignin": ["Default"] },
		bundleIdentifier: "com.uwhclub.app",
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			NSMicrophoneUsageDescription: microphonePermission,
		},
	},
	android: {
		package: "com.uwhclub.app",
		softwareKeyboardLayoutMode: "resize",
	},
	web: {
		bundler: "metro",
		output: "static",
		favicon: "./assets/app-icon.png",
	},
	plugins: [
		[
			"expo-widgets",
			{
				widgets: [
					{
						name: "NextPractice",
						displayName: "Next Practice",
						description: "See your next practice and lineup.",
						ios: { supportedFamilies: ["systemSmall", "systemMedium"] },
					},
				],
			},
		],
		[
			"expo-video",
			{ supportsBackgroundPlayback: false, supportsPictureInPicture: false },
		],
		[
			"expo-audio",
			{
				microphonePermission,
				enableBackgroundPlayback: false,
				enableBackgroundRecording: false,
			},
		],
		"expo-notifications",
		[
			"expo-speech-recognition",
			{
				microphonePermission,
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
				microphonePermission,
			},
		],
		"expo-router",
		"expo-font",
		"expo-status-bar",
		[
			"expo-splash-screen",
			{
				backgroundColor: "#080A0D",
				image: "./assets/loading/loading-puck-dark.png",
				imageWidth: 320,
				resizeMode: "contain",
				dark: {
					backgroundColor: "#080A0D",
					image: "./assets/loading/loading-puck-dark.png",
				},
			},
		],
	],
};

export default config;
