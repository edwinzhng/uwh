import { nativeFeatureAvailable } from "../platform/native-feature";
import { loadAvailableMenu } from "./native-menu-policy";

export const NativeMenuView = loadAvailableMenu(
	nativeFeatureAvailable("ExpoUI"),
	() => {
		const menu: typeof import("@expo/ui/community/menu") = require("@expo/ui/community/menu");
		return menu.MenuView;
	},
);
