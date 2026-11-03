import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { performOptionalHaptic } from "./haptics-policy";

type NativeHaptics = {
	impactAsync?: (style: string) => Promise<void>;
	performHapticsAsync?: (kind: string) => Promise<void>;
};
const nativeModule = (): NativeHaptics | undefined => {
	if (Platform.OS !== "ios" && Platform.OS !== "android") return;
	try {
		return (
			requireOptionalNativeModule<NativeHaptics>("ExpoHaptics") ?? undefined
		);
	} catch {
		return;
	}
};
export const nativeHapticsAvailable = (): boolean => {
	const module = nativeModule();
	return Platform.OS === "ios"
		? Boolean(module?.impactAsync)
		: Platform.OS === "android" && Boolean(module?.performHapticsAsync);
};
export const lightNativeHaptic = (enabled: boolean): Promise<void> =>
	performOptionalHaptic(
		{
			platform: Platform.OS,
			enabled,
			available: enabled && nativeHapticsAvailable(),
		},
		async (kind): Promise<void> => {
			const haptics = await import("expo-haptics");
			if (kind === "light")
				await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
			else
				await haptics.performAndroidHapticsAsync(
					haptics.AndroidHaptics.Context_Click,
				);
		},
	);
