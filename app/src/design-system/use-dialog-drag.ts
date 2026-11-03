import { useCallback, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { DialogDragOptions, DialogDragResult } from "./dialog-drag-types";
import {
	canStartSheetDrag,
	dialogTransitionDuration,
	sheetDragOffset,
	shouldDismissSheet,
} from "./dialog-state";
import { motion } from "./tokens";

export const useDialogDrag = (options: DialogDragOptions): DialogDragResult => {
	const { enabled, animate } = options;
	const current = useRef(options);
	current.current = options;
	const offset = useSharedValue(0);
	const originX = useSharedValue(0);
	const originY = useSharedValue(0);
	const grabbed = useSharedValue(0);
	const commitDismiss = useCallback((): void => {
		if (current.current.enabled) current.current.onDismiss();
	}, []);
	const gesture = useMemo(
		() =>
			Gesture.Pan()
				.enabled(enabled)
				.maxPointers(1)
				.manualActivation(true)
				.onTouchesDown((event): void => {
					const point = event.allTouches.at(0);
					if (!point) return;
					originX.set(point.absoluteX);
					originY.set(point.absoluteY);
				})
				.onTouchesMove((event, manager): void => {
					const point = event.allTouches.at(0);
					if (
						point &&
						canStartSheetDrag(
							point.absoluteX - originX.get(),
							point.absoluteY - originY.get(),
						)
					)
						manager.activate();
				})
				.onStart((): void => {
					grabbed.set(offset.get());
					cancelAnimation(offset);
				})
				.onUpdate((event): void => {
					offset.set(sheetDragOffset(grabbed.get() + event.translationY));
				})
				.onEnd((event): void => {
					if (shouldDismissSheet(grabbed.get() + event.translationY))
						scheduleOnRN(commitDismiss);
				})
				.onFinalize((): void => {
					offset.set(
						withTiming(0, {
							duration: dialogTransitionDuration(animate),
							easing: Easing.bezier(...motion.easing.emphasized),
							reduceMotion: ReduceMotion.System,
						}),
					);
				}),
		[enabled, animate, originX, originY, grabbed, offset, commitDismiss],
	);
	return { handlers: {}, gesture, offset };
};
