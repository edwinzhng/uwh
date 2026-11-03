import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { AccessibilityInfo, Platform } from "react-native";

const ReduceTransparencyContext = createContext(true);

export const useReduceTransparency = (): boolean =>
	useContext(ReduceTransparencyContext);

export const MaterialAccessibilityProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [reduced, setReduced] = useState(Platform.OS === "ios");
	useEffect(() => {
		if (Platform.OS !== "ios") return;
		void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduced);
		const subscription = AccessibilityInfo.addEventListener(
			"reduceTransparencyChanged",
			setReduced,
		);
		return (): void => subscription.remove();
	}, []);
	return (
		<ReduceTransparencyContext value={reduced}>
			{children}
		</ReduceTransparencyContext>
	);
};
