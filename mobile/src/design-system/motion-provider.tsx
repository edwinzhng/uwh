import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { reduceMotionAtom } from "./theme";
import { MotionContext } from "./use-motion";

export const MotionProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const forced = useAtomValue(reduceMotionAtom);
	const [systemReduced, setSystemReduced] = useState(true);
	useEffect(() => {
		void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduced);
		const subscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setSystemReduced,
		);
		return (): void => subscription.remove();
	}, []);
	return (
		<MotionContext value={!forced && !systemReduced}>{children}</MotionContext>
	);
};
