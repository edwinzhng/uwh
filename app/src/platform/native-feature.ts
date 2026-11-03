import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export const nativeFeatureAvailable = (moduleName: string): boolean => {
	if (Platform.OS === "web") return true;
	try {
		return Boolean(requireOptionalNativeModule(moduleName));
	} catch {
		return false;
	}
};

export const requireNativeFeature = (
	moduleName: string,
	feature: string,
): void => {
	if (!nativeFeatureAvailable(moduleName))
		throw new Error(`Rebuild app to use ${feature}.`);
};
