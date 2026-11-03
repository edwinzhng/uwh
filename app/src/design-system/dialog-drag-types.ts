import type { GestureResponderHandlers } from "react-native";
import type { GestureType } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

export type DialogDragOptions = {
	enabled: boolean;
	animate: boolean;
	onDismiss: () => void;
};

export type DialogDragResult = {
	handlers: GestureResponderHandlers;
	gesture?: GestureType;
	offset: SharedValue<number>;
};
