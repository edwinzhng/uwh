import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { trackPageMotionInput } from "./page-motion-input";
import { reduceMotionAtom } from "./theme";
import { MotionContext, MotionSettingsReadyContext } from "./use-motion";

export const MotionProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	useEffect(trackPageMotionInput, []);
	const forced = useAtomValue(reduceMotionAtom);
	const [systemReduced, setSystemReduced] = useState<boolean>();
	useEffect(() => {
		void AccessibilityInfo.isReduceMotionEnabled().then(
			setSystemReduced,
			(): void => setSystemReduced(true),
		);
		const subscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			setSystemReduced,
		);
		return (): void => subscription.remove();
	}, []);
	return (
		<MotionSettingsReadyContext value={systemReduced !== undefined}>
			<MotionContext value={!forced && systemReduced === false}>
				{children}
			</MotionContext>
		</MotionSettingsReadyContext>
	);
};
