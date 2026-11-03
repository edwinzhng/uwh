import { Platform, UIManager } from "react-native";
import { nativeTabsComponents } from "./native-navigation-model";

const compiledNativeTabsAvailable = (): boolean => {
	const components = nativeTabsComponents(Platform.OS);
	if (!components.length) return false;
	try {
		return components.every((name) => UIManager.hasViewManagerConfig(name));
	} catch {
		return false;
	}
};

const available = compiledNativeTabsAvailable();

export const nativeTabsAvailable = (): boolean => available;
