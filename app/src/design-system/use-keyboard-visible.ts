import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export const useKeyboardVisible = (): boolean => {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const shown = Keyboard.addListener("keyboardDidShow", (): void =>
			setVisible(true),
		);
		const hidden = Keyboard.addListener("keyboardDidHide", (): void =>
			setVisible(false),
		);
		return (): void => {
			shown.remove();
			hidden.remove();
		};
	}, []);
	return visible;
};
