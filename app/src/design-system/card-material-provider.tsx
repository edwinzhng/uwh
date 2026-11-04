import { motionEffects } from "@uwhclub/design-system/tokens";
import { type ReactElement, type ReactNode, useEffect } from "react";
import {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { CardMaterialContext } from "./card-material-context";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

export const CardMaterialProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const phase = useSharedValue(0);
	const motionEnabled = useMotion();
	const active = useScreenActive();
	useEffect(() => {
		cancelAnimation(phase);
		if (!motionEnabled || !active) return;
		const config = {
			duration: motionEffects.cardMaterialFlow,
			easing: Easing.bezier(...motion.easing["in-out"]),
			reduceMotion: ReduceMotion.System,
		};
		phase.set(
			withRepeat(
				withSequence(withTiming(1, config), withTiming(0, config)),
				-1,
			),
		);
		return (): void => cancelAnimation(phase);
	}, [active, motionEnabled, phase]);
	return <CardMaterialContext value={phase}>{children}</CardMaterialContext>;
};
